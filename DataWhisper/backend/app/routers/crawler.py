"""
Crawler API.

Builds end-to-end lineage by recursively crawling a tree of CrawlSources:

    repo A   ──► discovers Postgres host  ──► user provides creds ──► DbConnection (scan + lineage)
            └──► discovers git+https dep   ──► user provides PAT   ──► CrawlSource B (sub-crawl)
                                                                      └──► discovers …

Key design points:
  - All crawl execution lives in `app.services.crawl_runner.run_crawl`. The
    router only enqueues jobs via `app.services.jobs.enqueue_crawl` — which
    chooses arq+Redis when `REDIS_URL` is set, or FastAPI `BackgroundTasks`
    when not (dev fallback).
  - `CrawlSession.progressJson` carries a `pipeline_steps` array used by the UI
    to render the live pipeline view.
  - Discoveries are persisted as `DiscoveredResource` rows (not stuffed into
    progressJson) so the UI can manage them per-row with dynamic forms.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from prisma import Json
from pydantic import BaseModel, Field

from app.db import prisma
from app.deps import get_current_user
from app.services.audit import log_audit
from app.services.connector_specs import CONNECTOR_SPECS, get_spec
from app.services.crawl_runner import GIT_CLONE_SOURCE_TYPES, NATIVE_SCANNER_TYPES
from app.services.jobs import enqueue_crawl
from app.services.metadata_pipeline import run_metadata_scan_for_connection
from app.services.table_names import resolve_table_to_known
from app.utils.encrypt import decrypt_json, encrypt_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crawler", tags=["crawler"])

# Crawlable types (have a real engine: git clone OR native scanner).
CRAWLABLE_SOURCE_TYPES = GIT_CLONE_SOURCE_TYPES | NATIVE_SCANNER_TYPES
# All accepted CrawlSource sourceType values (validated on create).
SUPPORTED_SOURCE_TYPES = CRAWLABLE_SOURCE_TYPES | {"AIRFLOW", "DBT_CLOUD"}


# --- Schemas ---------------------------------------------------------------

class CrawlSourceCreate(BaseModel):
    name: str
    source_type: str
    config: dict


class CrawlSourceOut(BaseModel):
    id: str
    name: str
    source_type: str
    status: str
    last_crawled_at: str | None
    created_at: str
    parent_crawl_source_id: str | None = None
    origin_discovery_id: str | None = None


class PipelineStep(BaseModel):
    name: str
    status: str  # pending | running | done | failed
    started_at: str | None = None
    completed_at: str | None = None
    message: str | None = None


class CrawlSessionOut(BaseModel):
    id: str
    status: str
    files_scanned: int
    edges_found: int
    error_message: str | None
    started_at: str
    completed_at: str | None
    pipeline_steps: list[PipelineStep] = Field(default_factory=list)
    discoveries_found: int = 0


class CodeLineageNodeOut(BaseModel):
    id: str
    node_type: str
    node_name: str
    source_file: str | None
    environment: str
    parent_node_id: str | None
    metadata: dict | None


class DiscoveredResourceOut(BaseModel):
    id: str
    crawl_source_id: str
    kind: str
    uri: str
    display_name: str
    detail: dict | None
    source_file: str | None
    status: str
    child_crawl_source_id: str | None
    child_connection_id: str | None
    created_at: str
    resolved_at: str | None


class ConnectDiscoveryBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    credentials: dict
    start_crawl: bool = True


# --- Helpers ---------------------------------------------------------------

def _source_to_out(src) -> CrawlSourceOut:
    return CrawlSourceOut(
        id=src.id,
        name=src.name,
        source_type=src.sourceType,
        status=src.status,
        last_crawled_at=src.lastCrawledAt.isoformat() if src.lastCrawledAt else None,
        created_at=src.createdAt.isoformat(),
        parent_crawl_source_id=src.parentCrawlSourceId,
        origin_discovery_id=src.originDiscoveryId,
    )


def _session_to_out(s) -> CrawlSessionOut:
    progress = s.progressJson if isinstance(s.progressJson, dict) else {}
    steps_raw = progress.get("pipeline_steps") or []
    steps = [PipelineStep(**step) for step in steps_raw if isinstance(step, dict) and "name" in step]
    return CrawlSessionOut(
        id=s.id,
        status=s.status,
        files_scanned=s.filesScanned,
        edges_found=s.edgesFound,
        error_message=s.errorMessage,
        started_at=s.startedAt.isoformat(),
        completed_at=s.completedAt.isoformat() if s.completedAt else None,
        pipeline_steps=steps,
        discoveries_found=int(progress.get("discoveries_found") or 0),
    )


def _node_to_out(n) -> CodeLineageNodeOut:
    meta = n.metadata if isinstance(n.metadata, dict) else None
    return CodeLineageNodeOut(
        id=n.id,
        node_type=n.nodeType,
        node_name=n.nodeName,
        source_file=n.sourceFile,
        environment=n.environment,
        parent_node_id=n.parentNodeId,
        metadata=meta,
    )


def _disc_to_out(d) -> DiscoveredResourceOut:
    return DiscoveredResourceOut(
        id=d.id,
        crawl_source_id=d.crawlSourceId,
        kind=d.kind,
        uri=d.uri,
        display_name=d.displayName,
        detail=d.detail if isinstance(d.detail, dict) else None,
        source_file=d.sourceFile,
        status=d.status,
        child_crawl_source_id=d.childCrawlSourceId,
        child_connection_id=d.childConnectionId,
        created_at=d.createdAt.isoformat(),
        resolved_at=d.resolvedAt.isoformat() if d.resolvedAt else None,
    )


# --- Background crawl task -------------------------------------------------
# The full pipeline lives in `app.services.crawl_runner.run_crawl`; we just enqueue it.

# --- Endpoints: sources ----------------------------------------------------


@router.get("/connector-specs")
async def list_connector_specs(user=Depends(get_current_user)):
    """Return the credential schema the UI uses to render dynamic 'Connect' forms."""
    return {"specs": CONNECTOR_SPECS}


@router.post("/sources", response_model=CrawlSourceOut, status_code=201)
async def create_source(body: CrawlSourceCreate, user=Depends(get_current_user)):
    if body.source_type not in SUPPORTED_SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported source type: {body.source_type}")

    encrypted = encrypt_json(body.config)
    source = await prisma.crawlsource.create(
        data={
            "workspaceId": str(user.workspaceId),
            "name": body.name,
            "sourceType": body.source_type,
            "encryptedConfig": encrypted,
        }
    )

    await log_audit(
        str(user.workspaceId), str(user.id),
        "crawl_source.create",
        resource_type="crawl_source", resource_id=source.id,
        detail={"name": body.name, "source_type": body.source_type},
    )
    return _source_to_out(source)


@router.get("/sources", response_model=list[CrawlSourceOut])
async def list_sources(user=Depends(get_current_user)):
    sources = await prisma.crawlsource.find_many(
        where={"workspaceId": str(user.workspaceId)},
        order={"createdAt": "desc"},
    )
    return [_source_to_out(s) for s in sources]


@router.get("/sources/{source_id}", response_model=CrawlSourceOut)
async def get_source(source_id: str, user=Depends(get_current_user)):
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    return _source_to_out(source)


@router.delete("/sources/{source_id}", status_code=204)
async def delete_source(source_id: str, user=Depends(get_current_user)):
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    await prisma.crawlsource.delete(where={"id": source_id})
    await log_audit(
        str(user.workspaceId), str(user.id),
        "crawl_source.delete",
        resource_type="crawl_source", resource_id=source_id,
    )


@router.get("/sources/{source_id}/config")
async def get_source_config(source_id: str, user=Depends(get_current_user)):
    """
    Return the source's config with secret fields redacted.

    The UI uses this to pre-fill the Edit dialog. Secret fields whose values were set
    come back as the sentinel string `__KEEP_EXISTING__` so the form can render
    "Keep existing token" placeholder text without leaking the value.
    """
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")

    spec_kind = _spec_kind_for_source_type(source.sourceType)
    spec = get_spec(spec_kind)
    raw = decrypt_json(source.encryptedConfig) or {}
    redacted = _redact_config(raw, spec)
    return {
        "id": source.id,
        "name": source.name,
        "source_type": source.sourceType,
        "spec_kind": spec_kind,
        "config": redacted,
    }


@router.patch("/sources/{source_id}", response_model=CrawlSourceOut)
async def update_source(
    source_id: str,
    body: CrawlSourceUpdate,
    user=Depends(get_current_user),
):
    """
    Partial update of a CrawlSource (rename and/or change credentials/branch/etc.).

    Secret fields use a "keep existing" convention: empty string or the sentinel
    `__KEEP_EXISTING__` for a secret field means "do not change that value". This
    keeps the API safe even though the UI never sees decrypted secrets.

    Refuses to update a source that is currently CRAWLING (409).
    """
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    if source.status == "CRAWLING":
        raise HTTPException(status_code=409, detail="Cannot edit a source while it is crawling")

    update_data: dict[str, Any] = {}

    if body.name is not None and body.name.strip() and body.name.strip() != source.name:
        update_data["name"] = body.name.strip()

    config_changed_keys: list[str] = []
    if body.config is not None:
        spec_kind = _spec_kind_for_source_type(source.sourceType)
        spec = get_spec(spec_kind)
        existing = decrypt_json(source.encryptedConfig) or {}
        merged = _merge_config(existing, body.config, spec)
        # Validate required fields are still present after the merge.
        if spec:
            missing = [
                f["name"] for f in spec.get("fields", [])
                if f.get("required") and (merged.get(f["name"]) in (None, ""))
            ]
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"After update, these required fields would be empty: {', '.join(missing)}",
                )
        if merged != existing:
            update_data["encryptedConfig"] = encrypt_json(merged)
            config_changed_keys = sorted(k for k in body.config.keys() if existing.get(k) != merged.get(k))
            # If the user previously failed auth and is now updating creds, reset status.
            if source.status in ("ERROR", "PENDING_AUTH"):
                update_data["status"] = "READY"

    if not update_data:
        return _source_to_out(source)

    updated = await prisma.crawlsource.update(
        where={"id": source_id},
        data=update_data,
    )

    await log_audit(
        str(user.workspaceId), str(user.id),
        "crawl_source.update",
        resource_type="crawl_source", resource_id=source_id,
        detail={
            "renamed": "name" in update_data,
            "config_changed_fields": config_changed_keys,
            "reset_status": update_data.get("status"),
        },
    )
    return _source_to_out(updated)


@router.post("/sources/{source_id}/crawl", status_code=202)
async def start_crawl(
    source_id: str,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    if source.status == "CRAWLING":
        raise HTTPException(status_code=409, detail="A crawl is already running for this source")
    if source.sourceType not in CRAWLABLE_SOURCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Crawl is not implemented for source type {source.sourceType}. "
                f"Use one of: {', '.join(sorted(CRAWLABLE_SOURCE_TYPES))}."
            ),
        )

    config = decrypt_json(source.encryptedConfig)
    job_id = await enqueue_crawl(
        source_id=source_id,
        workspace_id=str(user.workspaceId),
        config=config,
        background_tasks=background_tasks,
    )

    await log_audit(
        str(user.workspaceId), str(user.id),
        "crawl_source.crawl_started",
        resource_type="crawl_source", resource_id=source_id,
        detail={"job_id": job_id},
    )
    return {"message": "Crawl started", "source_id": source_id, "job_id": job_id}


class CredentialUpdate(BaseModel):
    """Retry flow: update credentials for a paused crawl."""
    config: dict


class CrawlSourceUpdate(BaseModel):
    """
    Partial update of a CrawlSource. All fields optional.

    `config` is a *partial* dict: only the keys you include overwrite existing values.
    A secret field set to "" means "keep what was there" so the UI can render the form
    with redacted secrets and the user only re-types the ones they actually want to change.
    """
    name: str | None = Field(default=None, min_length=1, max_length=255)
    config: dict | None = None


def _spec_kind_for_source_type(source_type: str) -> str:
    """Connector-spec `kind` to use for a CrawlSource.sourceType (drives the edit form)."""
    if source_type in {"GITHUB", "GITLAB", "BITBUCKET", "CUSTOM"}:
        return "GIT_REPO"
    return source_type  # S3, MONGODB, KAFKA, REST_API map 1:1


def _redact_config(config: dict[str, Any], spec: dict[str, Any] | None) -> dict[str, Any]:
    """Strip secret values out of a config so it can safely be shown in the edit UI."""
    if not spec:
        return {}
    secret_names = {f["name"] for f in spec.get("fields") or [] if f.get("secret")}
    redacted: dict[str, Any] = {}
    for k, v in config.items():
        if k in secret_names:
            redacted[k] = "" if not v else "__KEEP_EXISTING__"
        else:
            redacted[k] = v
    return redacted


def _merge_config(existing: dict[str, Any], incoming: dict[str, Any], spec: dict[str, Any] | None) -> dict[str, Any]:
    """
    Merge `incoming` keys into `existing`, treating empty-string + sentinel values for
    secret fields as "keep existing".
    """
    merged = dict(existing)
    secret_names = {f["name"] for f in (spec.get("fields") if spec else []) or [] if f.get("secret")}
    for k, v in incoming.items():
        if k in secret_names and (v in ("", None, "__KEEP_EXISTING__")):
            continue  # leave existing secret untouched
        merged[k] = v
    return merged


@router.post("/sessions/{session_id}/retry", status_code=202)
async def retry_session(
    session_id: str,
    body: CredentialUpdate,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    session = await prisma.crawlsession.find_first(
        where={"id": session_id}, include={"crawlSource": True},
    )
    if not session or not session.crawlSource:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.crawlSource.workspaceId != str(user.workspaceId):
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status not in ("FAILED", "PAUSED_NEEDS_CREDS"):
        raise HTTPException(status_code=400, detail="Session is not in a retryable state")
    if session.crawlSource.sourceType not in CRAWLABLE_SOURCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Retry is only supported for crawlable source types: {', '.join(sorted(CRAWLABLE_SOURCE_TYPES))}.",
        )

    encrypted = encrypt_json(body.config)
    await prisma.crawlsource.update(
        where={"id": session.crawlSourceId},
        data={"encryptedConfig": encrypted, "status": "READY"},
    )
    await enqueue_crawl(
        source_id=session.crawlSourceId,
        workspace_id=str(user.workspaceId),
        config=body.config,
        background_tasks=background_tasks,
    )

    await log_audit(
        str(user.workspaceId), str(user.id),
        "crawl_source.crawl_retried",
        resource_type="crawl_session", resource_id=session_id,
    )
    return {"message": "Crawl retried with updated credentials", "session_id": session_id}


@router.get("/sources/{source_id}/sessions", response_model=list[CrawlSessionOut])
async def list_sessions(source_id: str, user=Depends(get_current_user)):
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    sessions = await prisma.crawlsession.find_many(
        where={"crawlSourceId": source_id}, order={"startedAt": "desc"},
    )
    return [_session_to_out(s) for s in sessions]


@router.get("/sources/{source_id}/lineage", response_model=list[CodeLineageNodeOut])
async def get_source_lineage(source_id: str, user=Depends(get_current_user)):
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    nodes = await prisma.codelineagenode.find_many(
        where={"crawlSourceId": source_id}, order={"createdAt": "desc"},
    )
    return [_node_to_out(n) for n in nodes]


SYMBOL_NODE_TYPES = {"MODULE", "CLASS", "FUNCTION", "METHOD", "EXTERNAL",
                     "INTERFACE", "TRAIT", "ENUM"}


@router.get("/sources/{source_id}/symbol-graph")
async def get_symbol_graph(
    source_id: str,
    edge_types: str | None = None,
    focus: str | None = None,
    depth: int = 2,
    max_nodes: int = 800,
    user=Depends(get_current_user),
):
    """
    Return the tree-sitter code-structure graph for a crawl source.

    Query params
    ------------
    - edge_types: comma-separated subset of CALLS,IMPORTS,EXTENDS,IMPLEMENTS,INSTANTIATES (default: all)
    - focus: optional node id; if provided, returns only nodes reachable within
      `depth` hops (in either direction) from that node
    - depth: BFS depth from focus (default 2)
    - max_nodes: hard cap on returned nodes (default 800)
    """
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")

    all_nodes = await prisma.codelineagenode.find_many(
        where={"crawlSourceId": source_id},
    )
    sym_nodes = [n for n in all_nodes if n.nodeType in SYMBOL_NODE_TYPES]
    sym_node_ids = {n.id for n in sym_nodes}

    edges = await prisma.codesymboledge.find_many(
        where={"crawlSourceId": source_id},
    )

    wanted_types: set[str] | None = None
    if edge_types:
        wanted_types = {t.strip().upper() for t in edge_types.split(",") if t.strip()}
    if wanted_types:
        edges = [e for e in edges if e.edgeType in wanted_types]
    edges = [e for e in edges if e.fromNodeId in sym_node_ids and e.toNodeId in sym_node_ids]

    if focus:
        adj_out: dict[str, list[str]] = {}
        adj_in: dict[str, list[str]] = {}
        for e in edges:
            adj_out.setdefault(e.fromNodeId, []).append(e.toNodeId)
            adj_in.setdefault(e.toNodeId, []).append(e.fromNodeId)
        visited = {focus}
        frontier = {focus}
        for _ in range(max(0, depth)):
            nxt: set[str] = set()
            for v in frontier:
                nxt.update(adj_out.get(v, []))
                nxt.update(adj_in.get(v, []))
            nxt -= visited
            if not nxt:
                break
            visited.update(nxt)
            frontier = nxt
        sym_nodes = [n for n in sym_nodes if n.id in visited]
        edges = [e for e in edges if e.fromNodeId in visited and e.toNodeId in visited]

    if len(sym_nodes) > max_nodes:
        # Keep the most-connected nodes first
        degree: dict[str, int] = {}
        for e in edges:
            degree[e.fromNodeId] = degree.get(e.fromNodeId, 0) + 1
            degree[e.toNodeId] = degree.get(e.toNodeId, 0) + 1
        sym_nodes.sort(key=lambda n: degree.get(n.id, 0), reverse=True)
        sym_nodes = sym_nodes[:max_nodes]
        kept = {n.id for n in sym_nodes}
        edges = [e for e in edges if e.fromNodeId in kept and e.toNodeId in kept]

    def _node_payload(n) -> dict[str, Any]:
        meta = n.metadata or {}
        if not isinstance(meta, dict):
            meta = {}
        return {
            "id": n.id,
            "node_type": n.nodeType,
            "symbol_id": n.nodeName,
            "name": meta.get("display_name") or n.nodeName.rsplit("::", 1)[-1],
            "qualified_name": meta.get("qualified_name") or n.nodeName,
            "language": meta.get("language"),
            "source_file": n.sourceFile,
            "source_line": n.sourceLine,
            "parent_id": n.parentNodeId,
            "metadata": meta,
        }

    def _edge_payload(e) -> dict[str, Any]:
        meta = e.metadata or {}
        if not isinstance(meta, dict):
            meta = {}
        return {
            "id": e.id,
            "from": e.fromNodeId,
            "to": e.toNodeId,
            "edge_type": e.edgeType,
            "source_file": e.sourceFile,
            "source_line": e.sourceLine,
            "count": meta.get("count", 1),
            "metadata": meta,
        }

    return {
        "nodes": [_node_payload(n) for n in sym_nodes],
        "edges": [_edge_payload(e) for e in edges],
        "stats": {
            "total_nodes": len(sym_nodes),
            "total_edges": len(edges),
        },
    }


# --- Endpoints: discoveries -----------------------------------------------


@router.get("/discoveries", response_model=list[DiscoveredResourceOut])
async def list_workspace_discoveries(
    status: str | None = None,
    user=Depends(get_current_user),
):
    where: dict[str, Any] = {"workspaceId": str(user.workspaceId)}
    if status:
        where["status"] = status
    rows = await prisma.discoveredresource.find_many(
        where=where, order={"createdAt": "desc"},
    )
    return [_disc_to_out(r) for r in rows]


@router.get("/sources/{source_id}/discoveries", response_model=list[DiscoveredResourceOut])
async def list_source_discoveries(source_id: str, user=Depends(get_current_user)):
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")
    rows = await prisma.discoveredresource.find_many(
        where={"crawlSourceId": source_id},
        order={"createdAt": "desc"},
    )
    return [_disc_to_out(r) for r in rows]


@router.post("/discoveries/{discovery_id}/skip", status_code=200)
async def skip_discovery(discovery_id: str, user=Depends(get_current_user)):
    disc = await prisma.discoveredresource.find_first(
        where={"id": discovery_id, "workspaceId": str(user.workspaceId)},
    )
    if not disc:
        raise HTTPException(status_code=404, detail="Discovery not found")
    await prisma.discoveredresource.update(
        where={"id": discovery_id},
        data={"status": "SKIPPED", "resolvedAt": datetime.now(timezone.utc)},
    )
    return {"message": "Discovery skipped"}


@router.post("/sources/{source_id}/discoveries/skip-all", status_code=200)
async def skip_all_pending_discoveries(
    source_id: str,
    kind: str | None = None,
    host: str | None = None,
    user=Depends(get_current_user),
):
    """Bulk-mark PENDING_AUTH discoveries as SKIPPED.

    Optional filters:
      - kind: only skip discoveries of this kind (e.g. REST_API)
      - host: only skip discoveries whose display name or URI contains this string
    """
    source = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not source:
        raise HTTPException(status_code=404, detail="Crawl source not found")

    where: dict = {"crawlSourceId": source_id, "status": "PENDING_AUTH"}
    if kind:
        where["kind"] = kind

    rows = await prisma.discoveredresource.find_many(where=where)
    now = datetime.now(timezone.utc)
    skipped = 0
    needle = (host or "").strip().lower()
    for r in rows:
        if needle:
            blob = f"{r.uri or ''} {r.displayName or ''}".lower()
            if needle not in blob:
                continue
        await prisma.discoveredresource.update(
            where={"id": r.id},
            data={"status": "SKIPPED", "resolvedAt": now},
        )
        skipped += 1

    # If nothing is pending anymore, the source is effectively done.
    remaining = await prisma.discoveredresource.count(
        where={"crawlSourceId": source_id, "status": "PENDING_AUTH"}
    )
    if remaining == 0 and source.status == "PENDING_AUTH":
        await prisma.crawlsource.update(
            where={"id": source_id},
            data={"status": "DONE", "lastCrawledAt": now},
        )

    return {"skipped": skipped, "pending_remaining": remaining}


@router.post("/discoveries/{discovery_id}/connect", status_code=202)
async def connect_discovery(
    discovery_id: str,
    body: ConnectDiscoveryBody,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    """
    Provide credentials for a pending discovery.

    Behavior depends on the connector spec's `creates` field:
        - "crawl_source"   → create a new CrawlSource (e.g. discovered git repo) and
                             optionally kick off a sub-crawl.
        - "db_connection"  → create a new DbConnection so the user can scan the warehouse.
        - "discovery_only" → just record the resolved credentials (encrypted) for
                             future automation; nothing executable today.
    """
    disc = await prisma.discoveredresource.find_first(
        where={"id": discovery_id, "workspaceId": str(user.workspaceId)},
        include={"crawlSource": True},
    )
    if not disc:
        raise HTTPException(status_code=404, detail="Discovery not found")
    if disc.status not in ("PENDING_AUTH", "FAILED"):
        raise HTTPException(status_code=400, detail=f"Discovery is already {disc.status}")

    spec = get_spec(disc.kind)
    if not spec:
        raise HTTPException(status_code=400, detail=f"Unknown connector kind: {disc.kind}")

    # Light validation: required fields must be present.
    missing = [
        f["name"] for f in spec["fields"]
        if f.get("required") and (body.credentials.get(f["name"]) in (None, ""))
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required fields: {', '.join(missing)}",
        )

    creates = spec.get("creates")
    child_source_id: str | None = None
    child_connection_id: str | None = None

    if creates == "crawl_source":
        target_type = spec.get("target_source_type") or "CUSTOM"
        # If the discovery hints at the right host (gitlab/bitbucket/github/etc.) prefer that.
        if isinstance(disc.detail, dict):
            hinted = disc.detail.get("target_source_type")
            if hinted in CRAWLABLE_SOURCE_TYPES:
                target_type = hinted
        # The connector specs also drive non-git crawl sources (S3, MongoDB, Kafka, REST_API).
        if disc.kind in {"S3", "MONGODB", "KAFKA", "REST_API"}:
            target_type = disc.kind
        new_source = await prisma.crawlsource.create(
            data={
                "workspaceId": str(user.workspaceId),
                "name": body.name,
                "sourceType": target_type,
                "encryptedConfig": encrypt_json(body.credentials),
                "parentCrawlSourceId": disc.crawlSourceId,
                "originDiscoveryId": disc.id,
                "status": "READY",
            }
        )
        child_source_id = new_source.id
        if body.start_crawl and target_type in CRAWLABLE_SOURCE_TYPES:
            await enqueue_crawl(
                source_id=child_source_id,
                workspace_id=str(user.workspaceId),
                config=body.credentials,
                background_tasks=background_tasks,
            )

    elif creates == "db_connection":
        target_db_type = spec.get("target_db_type") or "POSTGRES"
        new_conn = await prisma.dbconnection.create(
            data={
                "workspaceId": str(user.workspaceId),
                "name": body.name,
                "type": target_db_type,
                "encryptedConfig": encrypt_json(body.credentials),
            }
        )
        child_connection_id = new_conn.id
        background_tasks.add_task(
            run_metadata_scan_for_connection,
            child_connection_id,
            str(user.workspaceId),
            str(user.id),
        )

    elif creates == "discovery_only":
        # Just keep encrypted credentials with the discovery for future reference.
        # We store the credentials on the discovery's `detail.credentials_encrypted`
        # so they can be retrieved when an adapter is added.
        pass

    else:
        raise HTTPException(status_code=400, detail=f"Connector spec has unknown 'creates' value: {creates}")

    # Resolve the discovery.
    detail_update: dict[str, Any] = dict(disc.detail) if isinstance(disc.detail, dict) else {}
    if creates == "discovery_only":
        detail_update["credentials_encrypted"] = encrypt_json(body.credentials)
    await prisma.discoveredresource.update(
        where={"id": discovery_id},
        data={
            "status": "CONNECTED",
            "childCrawlSourceId": child_source_id,
            "childConnectionId": child_connection_id,
            "resolvedAt": datetime.now(timezone.utc),
            "detail": Json(detail_update),
        },
    )

    await log_audit(
        str(user.workspaceId), str(user.id),
        "crawl_discovery.connect",
        resource_type="discovered_resource", resource_id=discovery_id,
        detail={
            "kind": disc.kind,
            "creates": creates,
            "child_crawl_source_id": child_source_id,
            "child_connection_id": child_connection_id,
        },
    )

    return {
        "message": "Discovery connected",
        "discovery_id": discovery_id,
        "child_crawl_source_id": child_source_id,
        "child_connection_id": child_connection_id,
        "sub_crawl_started": bool(child_source_id and body.start_crawl),
        "metadata_scan_started": bool(child_connection_id),
    }


# --- Tree / unified --------------------------------------------------------


@router.get("/sources/{source_id}/tree")
async def get_source_tree(source_id: str, user=Depends(get_current_user)):
    """Walk parent → children CrawlSource tree starting at `source_id`."""
    root = await prisma.crawlsource.find_first(
        where={"id": source_id, "workspaceId": str(user.workspaceId)},
    )
    if not root:
        raise HTTPException(status_code=404, detail="Crawl source not found")

    # Bounded BFS over children — keeps the tree reasonable in size.
    out: list[dict[str, Any]] = []
    visited: set[str] = set()
    queue: list[str] = [source_id]
    while queue and len(visited) < 200:
        cur = queue.pop(0)
        if cur in visited:
            continue
        visited.add(cur)
        node = await prisma.crawlsource.find_first(where={"id": cur})
        if not node:
            continue
        out.append({
            "id": node.id,
            "name": node.name,
            "source_type": node.sourceType,
            "status": node.status,
            "parent_crawl_source_id": node.parentCrawlSourceId,
            "origin_discovery_id": node.originDiscoveryId,
        })
        children = await prisma.crawlsource.find_many(where={"parentCrawlSourceId": cur})
        for c in children:
            queue.append(c.id)
    return {"root_id": source_id, "nodes": out}


# Node types from tree-sitter symbol extraction — not part of *data* lineage.
_UNIFIED_SYMBOL_NODE_TYPES = frozenset({
    "MODULE", "CLASS", "FUNCTION", "METHOD", "EXTERNAL", "INTERFACE", "TRAIT", "ENUM",
})


@router.get("/lineage/unified")
async def get_unified_lineage(user=Depends(get_current_user)):
    """Combine code lineage with DB FK lineage for a full end-to-end data flow graph."""
    workspace_id = str(user.workspaceId)

    code_nodes_raw = await prisma.codelineagenode.find_many(
        where={"crawlSource": {"is": {"workspaceId": workspace_id}}},
    )
    code_nodes = [n for n in code_nodes_raw if n.nodeType not in _UNIFIED_SYMBOL_NODE_TYPES]
    mv_list = await prisma.metadataversion.find_many(
        where={"connection": {"is": {"workspaceId": workspace_id}}},
        order={"version": "desc"},
        include={"lineageEdges": True, "connection": True},
    )

    seen_connections: set[str] = set()
    db_edges: list[dict[str, Any]] = []
    bridge_edges: list[dict[str, Any]] = []
    scanned_tables: list[dict[str, Any]] = []
    tables_by_connection: dict[str, set[str]] = {}

    for mv in mv_list:
        if mv.connectionId in seen_connections:
            continue
        seen_connections.add(mv.connectionId)
        meta = mv.metadataJson if isinstance(mv.metadataJson, dict) else {}
        table_names = {
            t["name"] for t in (meta.get("tables") or []) if isinstance(t, dict) and t.get("name")
        }
        tables_by_connection[mv.connectionId] = table_names
        for tname in sorted(table_names)[:50]:
            scanned_tables.append({
                "connection_id": mv.connectionId,
                "connection_name": mv.connection.name if mv.connection else None,
                "table_name": tname,
            })
        if mv.lineageEdges:
            for edge in mv.lineageEdges:
                db_edges.append({
                    "id": edge.id,
                    "source": "db_fk",
                    "from_table": edge.fromTable,
                    "to_table": edge.toTable,
                    "connection_id": mv.connectionId,
                    "connection_name": mv.connection.name if mv.connection else None,
                })

    for n in code_nodes:
        for conn_id, known in tables_by_connection.items():
            resolved = resolve_table_to_known(n.nodeName, known)
            if resolved:
                bridge_edges.append({
                    "source": "code_to_db",
                    "code_node_id": n.id,
                    "code_node_name": n.nodeName,
                    "db_table": resolved,
                    "connection_id": conn_id,
                    "environment": n.environment,
                })
                break

    return {
        "workspace_id": workspace_id,
        "code_lineage_nodes": [
            {
                "id": n.id,
                "source": "code",
                "node_type": n.nodeType,
                "node_name": n.nodeName,
                "source_file": n.sourceFile,
                "environment": n.environment,
                "parent_node_id": n.parentNodeId,
                "metadata": n.metadata if isinstance(n.metadata, dict) else None,
            }
            for n in code_nodes
        ],
        "db_lineage_edges": db_edges,
        "code_to_db_bridges": bridge_edges,
        "scanned_tables": scanned_tables,
        "total_code_nodes": len(code_nodes),
        "total_db_edges": len(db_edges),
        "total_bridges": len(bridge_edges),
    }

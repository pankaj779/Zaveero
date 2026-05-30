"""
Crawl runner — usable from both FastAPI BackgroundTasks (dev) and the arq worker
(production). Persists pipeline progress, lineage nodes, and discoveries.

`run_crawl()` dispatches on the CrawlSource's sourceType:

    GITHUB / GITLAB / BITBUCKET / CUSTOM  -> clone + analyze (github_crawler)
                                              + run discovery.discover_resources
    S3 / MONGODB / KAFKA / REST_API       -> scanners.run_scanner(source_type)
                                              (no clone, no discovery pass)

Everything is wrapped in `workspace_transaction()` so RLS policies match the
tenant even though there is no HTTP request context.
"""

from __future__ import annotations

import logging
import shutil
from datetime import datetime, timezone
from typing import Any

from prisma import Json

from app.db import prisma, workspace_transaction

logger = logging.getLogger(__name__)


# Source types that use the git-clone + file-walk crawler.
GIT_CLONE_SOURCE_TYPES = {"GITHUB", "GITLAB", "BITBUCKET", "CUSTOM"}
# Source types that have a native scanner.
NATIVE_SCANNER_TYPES = {"S3", "MONGODB", "KAFKA", "REST_API"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_steps(source_type: str) -> list[dict[str, Any]]:
    if source_type in GIT_CLONE_SOURCE_TYPES:
        return [
            {"name": "PREPARE", "status": "pending"},
            {"name": "CLONE", "status": "pending"},
            {"name": "SCAN", "status": "pending"},
            {"name": "SYMBOLS", "status": "pending"},
            {"name": "DISCOVER", "status": "pending"},
            {"name": "PERSIST", "status": "pending"},
            {"name": "DONE", "status": "pending"},
        ]
    # Native scanners skip clone — they call live APIs.
    return [
        {"name": "PREPARE", "status": "pending"},
        {"name": "CONNECT", "status": "pending"},
        {"name": "SCAN", "status": "pending"},
        {"name": "PERSIST", "status": "pending"},
        {"name": "DONE", "status": "pending"},
    ]


def _set_step(steps: list[dict[str, Any]], name: str, status: str, message: str | None = None) -> None:
    for s in steps:
        if s["name"] == name:
            s["status"] = status
            if status == "running" and not s.get("started_at"):
                s["started_at"] = _now_iso()
            if status in {"done", "failed"} and not s.get("completed_at"):
                s["completed_at"] = _now_iso()
            if message is not None:
                s["message"] = message
            return


async def _save_progress(
    session_id: str,
    *,
    steps: list[dict[str, Any]],
    files_scanned: int = 0,
    edges_found: int = 0,
    discoveries_found: int = 0,
    errors: list[Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "pipeline_steps": steps,
        "discoveries_found": discoveries_found,
        "errors": (errors or [])[:30],
    }
    if extra:
        payload.update(extra)
    await prisma.crawlsession.update(
        where={"id": session_id},
        data={
            "progressJson": Json(payload),
            "filesScanned": files_scanned,
            "edgesFound": edges_found,
        },
    )


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

async def _wipe_existing_nodes(source_id: str) -> None:
    # Edges first (FK -> nodes), then nodes themselves.
    await prisma.execute_raw(
        "DELETE FROM code_symbol_edges WHERE crawl_source_id = $1::uuid",
        source_id,
    )
    await prisma.execute_raw(
        "UPDATE code_lineage_nodes SET parent_node_id = NULL WHERE crawl_source_id = $1::uuid",
        source_id,
    )
    await prisma.execute_raw(
        "DELETE FROM code_lineage_nodes WHERE crawl_source_id = $1::uuid",
        source_id,
    )


async def _persist_symbol_graph(
    source_id: str,
    graph: dict[str, Any],
) -> tuple[int, int]:
    """Persist code_graph.extract_code_graph() output.

    Two-pass insert: nodes first (parent-after-child resolved via second pass),
    then edges referencing the freshly-created node IDs.
    """
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []

    # 1) Insert all nodes WITHOUT parent links first, remember symbol_id -> db id.
    sym_to_id: dict[str, str] = {}
    for n in nodes:
        sym = n.get("symbol_id")
        if not sym:
            continue
        try:
            rec = await prisma.codelineagenode.create(
                data={
                    "crawlSourceId": source_id,
                    "nodeType": n.get("node_type") or "MODULE",
                    "nodeName": sym,
                    "sourceFile": n.get("source_file"),
                    "sourceLine": n.get("source_line"),
                    "metadata": Json({
                        "display_name": n.get("name"),
                        "qualified_name": n.get("qualified_name"),
                        "language": n.get("language"),
                        **(n.get("metadata") or {}),
                    }),
                }
            )
            sym_to_id[sym] = rec.id
        except Exception as exc:
            logger.debug("failed to insert symbol node %s: %s", sym, exc)

    # 2) Second pass: link parent_node_id for containment.
    for n in nodes:
        sym = n.get("symbol_id")
        parent = n.get("parent_symbol_id")
        if sym and parent and sym in sym_to_id and parent in sym_to_id:
            try:
                await prisma.codelineagenode.update(
                    where={"id": sym_to_id[sym]},
                    data={"parentNodeId": sym_to_id[parent]},
                )
            except Exception:
                pass

    # 3) Insert edges. Skip self-loops and unresolved references the resolver
    #    couldn't bind to a node id.
    edges_inserted = 0
    for e in edges:
        f = e.get("from_symbol")
        t = e.get("to_symbol")
        if not f or not t or f == t:
            continue
        from_id = sym_to_id.get(f)
        to_id = sym_to_id.get(t)
        if not from_id or not to_id:
            continue
        try:
            await prisma.codesymboledge.create(
                data={
                    "crawlSourceId": source_id,
                    "fromNodeId": from_id,
                    "toNodeId": to_id,
                    "edgeType": e.get("edge_type") or "CALLS",
                    "sourceFile": e.get("source_file"),
                    "sourceLine": e.get("source_line"),
                    "metadata": Json(e.get("metadata") or {}),
                }
            )
            edges_inserted += 1
        except Exception as exc:
            # Likely unique-constraint hit on (from, to, type); ignore duplicates.
            logger.debug("skip duplicate edge %s -> %s (%s): %s", f, t, e.get("edge_type"), exc)

    return len(sym_to_id), edges_inserted


async def _wipe_pending_discoveries(source_id: str) -> int:
    """Drop unresolved discoveries from prior crawls so each crawl starts fresh.

    We only delete rows with status `PENDING_AUTH` — anything the user already
    Connected (creates a sub-source) or explicitly Skipped is preserved.
    """
    rows = await prisma.discoveredresource.find_many(
        where={"crawlSourceId": source_id, "status": "PENDING_AUTH"}
    )
    deleted = 0
    for r in rows:
        await prisma.discoveredresource.delete(where={"id": r.id})
        deleted += 1
    return deleted


async def _persist_nodes_and_edges(
    source_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> tuple[int, int, dict[str, str]]:
    """
    Insert standalone node entries and edges. Returns (edges_inserted, nodes_inserted, name_to_id).
    Both `nodes` (from scanners) and `edges` (from both scanners and code crawler) are
    supported. Nodes referenced only by edges are auto-created.
    """
    id_map: dict[str, str] = {}
    nodes_inserted = 0
    edges_inserted = 0

    # First insert explicit nodes (scanner-emitted).
    for n in nodes:
        name = n.get("node_name")
        if not name or name in id_map:
            continue
        rec = await prisma.codelineagenode.create(
            data={
                "crawlSourceId": source_id,
                "nodeType": n.get("node_type") or "PIPELINE_STEP",
                "nodeName": name,
                "sourceFile": n.get("source_file"),
                "environment": n.get("environment") or "UNKNOWN",
                "metadata": Json(n.get("metadata") or {}),
            }
        )
        id_map[name] = rec.id
        nodes_inserted += 1

    for edge in edges:
        from_node = edge.get("from_node", "")
        to_node = edge.get("to_node", "")
        edge_type = edge.get("edge_type", "TABLE_READ")

        if from_node and from_node not in id_map:
            rec = await prisma.codelineagenode.create(
                data={
                    "crawlSourceId": source_id,
                    "nodeType": "TABLE_READ" if "READ" in edge_type else "TABLE_WRITE",
                    "nodeName": from_node,
                    "sourceFile": edge.get("source_file"),
                    "environment": edge.get("environment", "UNKNOWN"),
                }
            )
            id_map[from_node] = rec.id
            nodes_inserted += 1

        if to_node and to_node not in id_map:
            rec = await prisma.codelineagenode.create(
                data={
                    "crawlSourceId": source_id,
                    "nodeType": (
                        "TABLE_WRITE" if ("TRANSFORM" in edge_type or "WRITE" in edge_type)
                        else "PIPELINE_STEP"
                    ),
                    "nodeName": to_node,
                    "sourceFile": edge.get("source_file"),
                    "environment": edge.get("environment", "UNKNOWN"),
                    "parentNodeId": id_map.get(from_node),
                }
            )
            id_map[to_node] = rec.id
            nodes_inserted += 1
        elif to_node and from_node and id_map.get(to_node):
            await prisma.codelineagenode.update(
                where={"id": id_map[to_node]},
                data={"parentNodeId": id_map.get(from_node)},
            )
        edges_inserted += 1

    return edges_inserted, nodes_inserted, id_map


async def _persist_discoveries(
    source_id: str,
    workspace_id: str,
    discoveries: list[dict[str, Any]],
) -> int:
    inserted = 0
    for d in discoveries:
        kind = d.get("kind") or "UNKNOWN_URI"
        uri = d.get("uri") or ""
        if not uri:
            continue
        existing = await prisma.discoveredresource.find_first(
            where={"crawlSourceId": source_id, "uri": uri}
        )
        if existing:
            if existing.status == "PENDING_AUTH":
                await prisma.discoveredresource.update(
                    where={"id": existing.id},
                    data={
                        "kind": kind,
                        "displayName": d.get("display_name") or uri,
                        "detail": Json(d.get("detail") or {}),
                        "sourceFile": d.get("source_file"),
                    },
                )
            continue
        await prisma.discoveredresource.create(
            data={
                "workspaceId": workspace_id,
                "crawlSourceId": source_id,
                "kind": kind,
                "uri": uri,
                "displayName": d.get("display_name") or uri,
                "detail": Json(d.get("detail") or {}),
                "sourceFile": d.get("source_file"),
            }
        )
        inserted += 1
    return inserted


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------

async def run_crawl(source_id: str, workspace_id: str, config: dict[str, Any]) -> None:
    """
    Run a crawl to completion. Persists pipeline state every step.
    Safe to call from BackgroundTasks or an arq worker — opens Prisma if needed.
    """
    # Workers connect Prisma themselves at startup; if we're called from a fresh
    # process or test, make sure the connection is open.
    if not prisma.is_connected():
        await prisma.connect()

    # Re-fetch the source to learn the type. Use a workspace_transaction so RLS allows the read.
    async with workspace_transaction(workspace_id):
        src = await prisma.crawlsource.find_first(where={"id": source_id})
    if src is None:
        logger.error("run_crawl: source %s not found in workspace %s", source_id, workspace_id)
        return

    source_type = src.sourceType
    steps = _make_steps(source_type)
    session_id: str | None = None
    repo_path: str | None = None

    try:
        # ---- PREPARE -----------------------------------------------------
        _set_step(steps, "PREPARE", "running", "Initialising crawl session")
        async with workspace_transaction(workspace_id):
            await prisma.crawlsource.update(where={"id": source_id}, data={"status": "CRAWLING"})
            session = await prisma.crawlsession.create(
                data={
                    "crawlSourceId": source_id,
                    "status": "RUNNING",
                    "progressJson": Json({"pipeline_steps": steps}),
                }
            )
            session_id = session.id
        _set_step(steps, "PREPARE", "done", "Session created")

        if source_type in GIT_CLONE_SOURCE_TYPES:
            files_scanned, edges_found, scan_errors, discoveries = await _run_git_crawl(
                session_id=session_id,
                workspace_id=workspace_id,
                source_id=source_id,
                config=config,
                steps=steps,
            )
            # Persistence already done inside _run_git_crawl
        elif source_type in NATIVE_SCANNER_TYPES:
            files_scanned, edges_found, scan_errors, discoveries = await _run_native_scan(
                session_id=session_id,
                workspace_id=workspace_id,
                source_id=source_id,
                source_type=source_type,
                config=config,
                steps=steps,
            )
        else:
            raise RuntimeError(f"Crawl is not implemented for source type {source_type}")

        # ---- DONE --------------------------------------------------------
        async with workspace_transaction(workspace_id):
            pending = await prisma.discoveredresource.count(
                where={"crawlSourceId": source_id, "status": "PENDING_AUTH"}
            )
            now = datetime.now(timezone.utc)
            if pending > 0:
                _set_step(steps, "DONE", "done", f"{pending} discoveries waiting for credentials")
                await prisma.crawlsession.update(
                    where={"id": session_id},
                    data={
                        "status": "PAUSED_NEEDS_CREDS",
                        "filesScanned": files_scanned,
                        "edgesFound": edges_found,
                        "progressJson": Json({
                            "pipeline_steps": steps,
                            "discoveries_found": pending,
                            "errors": scan_errors[:30],
                        }),
                    },
                )
                await prisma.crawlsource.update(
                    where={"id": source_id}, data={"status": "PENDING_AUTH"},
                )
            else:
                _set_step(steps, "DONE", "done", "Crawl complete")
                await prisma.crawlsession.update(
                    where={"id": session_id},
                    data={
                        "status": "COMPLETED",
                        "filesScanned": files_scanned,
                        "edgesFound": edges_found,
                        "completedAt": now,
                        "progressJson": Json({
                            "pipeline_steps": steps,
                            "discoveries_found": 0,
                            "errors": scan_errors[:30],
                        }),
                    },
                )
                await prisma.crawlsource.update(
                    where={"id": source_id},
                    data={"status": "DONE", "lastCrawledAt": now},
                )

    except Exception as exc:
        logger.exception("Crawl failed for source %s", source_id)
        for s in steps:
            if s["status"] == "running":
                s["status"] = "failed"
                s["completed_at"] = _now_iso()
                s["message"] = str(exc)[:300]
                break
        try:
            async with workspace_transaction(workspace_id):
                if session_id:
                    await prisma.crawlsession.update(
                        where={"id": session_id},
                        data={
                            "status": "FAILED",
                            "errorMessage": str(exc)[:2000],
                            "completedAt": datetime.now(timezone.utc),
                            "progressJson": Json({
                                "pipeline_steps": steps,
                                "error": str(exc)[:2000],
                            }),
                        },
                    )
                await prisma.crawlsource.update(
                    where={"id": source_id}, data={"status": "ERROR"},
                )
        except Exception:
            logger.exception("Failed to persist crawl error state for source %s", source_id)
    finally:
        if repo_path:
            shutil.rmtree(repo_path, ignore_errors=True)


# ---------------------------------------------------------------------------
# Source-type specific runners
# ---------------------------------------------------------------------------

async def _run_git_crawl(
    *,
    session_id: str,
    workspace_id: str,
    source_id: str,
    config: dict[str, Any],
    steps: list[dict[str, Any]],
) -> tuple[int, int, list[Any], list[Any]]:
    from app.services.code_graph import extract_code_graph
    from app.services.discovery import discover_resources
    from app.services.github_crawler import clone_repo, crawl_repository

    repo_url = config.get("url") or config.get("repo_url") or ""
    if not repo_url:
        raise RuntimeError("Crawl config is missing 'url'.")
    token = config.get("token") or config.get("pat") or config.get("access_token")
    branch = config.get("branch")
    dialect = config.get("dialect")

    # CLONE
    _set_step(steps, "CLONE", "running", f"Cloning {repo_url}")
    async with workspace_transaction(workspace_id):
        await _save_progress(session_id, steps=steps)
    repo_path = await clone_repo(repo_url, token=token, branch=branch)
    _set_step(steps, "CLONE", "done", "Clone complete")

    try:
        # SCAN
        _set_step(steps, "SCAN", "running", "Extracting data lineage from files")
        async with workspace_transaction(workspace_id):
            await _save_progress(session_id, steps=steps)
        scan_result = await crawl_repository(repo_path, dialect=dialect)
        files_scanned = int(scan_result.get("files_scanned") or 0)
        scan_errors = list(scan_result.get("errors") or [])
        _set_step(steps, "SCAN", "done",
                  f"Scanned {files_scanned} files, {len(scan_result.get('edges') or [])} edges")

        # SYMBOLS — tree-sitter code-structure graph
        _set_step(steps, "SYMBOLS", "running", "Parsing source code with tree-sitter")
        async with workspace_transaction(workspace_id):
            await _save_progress(session_id, steps=steps, files_scanned=files_scanned)
        try:
            code_graph = extract_code_graph(repo_path)
        except Exception as exc:
            logger.exception("Code-graph extraction failed for source %s", source_id)
            code_graph = {"nodes": [], "edges": [], "files_scanned": 0,
                          "languages": {}, "errors": [str(exc)]}
            scan_errors.append({"file": "<code_graph>", "error": str(exc)})
        sym_files = int(code_graph.get("files_scanned") or 0)
        sym_node_count = len(code_graph.get("nodes") or [])
        sym_edge_count = len(code_graph.get("edges") or [])
        langs = code_graph.get("languages") or {}
        lang_summary = ", ".join(f"{k} ×{v}" for k, v in sorted(langs.items(), key=lambda kv: -kv[1])[:6]) or "(no parsable code)"
        _set_step(steps, "SYMBOLS", "done",
                  f"{sym_files} code files parsed → {sym_node_count} symbols, "
                  f"{sym_edge_count} edges • {lang_summary}")
        for err in (code_graph.get("errors") or [])[:20]:
            scan_errors.append({"file": "<code_graph>", "error": str(err)[:300]})

        # DISCOVER
        _set_step(steps, "DISCOVER", "running", "Looking for external resources")
        async with workspace_transaction(workspace_id):
            await _save_progress(session_id, steps=steps, files_scanned=files_scanned)
        try:
            discoveries = discover_resources(repo_path)
        except Exception as exc:
            logger.exception("Discovery failed for source %s", source_id)
            discoveries = []
            scan_errors.append({"file": "<discovery>", "error": str(exc)})
        _set_step(steps, "DISCOVER", "done", f"Found {len(discoveries)} external resources")

        # PERSIST
        _set_step(steps, "PERSIST", "running", "Saving lineage nodes, symbols, and discoveries")
        async with workspace_transaction(workspace_id):
            await _save_progress(
                session_id, steps=steps, files_scanned=files_scanned,
            )
            await _wipe_existing_nodes(source_id)
            await _wipe_pending_discoveries(source_id)
            data_edges, data_nodes, _ = await _persist_nodes_and_edges(
                source_id=source_id, nodes=[], edges=scan_result.get("edges", []),
            )
            sym_nodes_inserted, sym_edges_inserted = await _persist_symbol_graph(
                source_id, code_graph,
            )
            new_discoveries = await _persist_discoveries(source_id, workspace_id, discoveries)
            edges_inserted = data_edges + sym_edges_inserted
            nodes_inserted = data_nodes + sym_nodes_inserted
            _set_step(steps, "PERSIST", "done",
                      f"Saved {nodes_inserted} nodes ({sym_nodes_inserted} symbols), "
                      f"{edges_inserted} edges ({sym_edges_inserted} symbol edges), "
                      f"{new_discoveries} discoveries")
            await _save_progress(
                session_id, steps=steps,
                files_scanned=files_scanned, edges_found=edges_inserted,
                discoveries_found=new_discoveries, errors=scan_errors,
                extra={"symbol_nodes": sym_nodes_inserted, "symbol_edges": sym_edges_inserted,
                       "languages": langs},
            )

        return files_scanned, edges_inserted, scan_errors, discoveries
    finally:
        shutil.rmtree(repo_path, ignore_errors=True)


async def _run_native_scan(
    *,
    session_id: str,
    workspace_id: str,
    source_id: str,
    source_type: str,
    config: dict[str, Any],
    steps: list[dict[str, Any]],
) -> tuple[int, int, list[Any], list[Any]]:
    from app.services.scanners import run_scanner

    # CONNECT
    _set_step(steps, "CONNECT", "running", f"Connecting to {source_type}")
    async with workspace_transaction(workspace_id):
        await _save_progress(session_id, steps=steps)

    # SCAN
    _set_step(steps, "CONNECT", "done")
    _set_step(steps, "SCAN", "running", f"Listing resources via {source_type} API")
    async with workspace_transaction(workspace_id):
        await _save_progress(session_id, steps=steps)
    scan_result = await run_scanner(source_type, config)
    scan_errors = list(scan_result.get("errors") or [])
    files_scanned = int(scan_result.get("files_scanned") or 0)
    _set_step(steps, "SCAN", "done",
              f"{len(scan_result.get('nodes') or [])} nodes, "
              f"{len(scan_result.get('edges') or [])} edges")

    # PERSIST
    _set_step(steps, "PERSIST", "running", "Saving lineage")
    async with workspace_transaction(workspace_id):
        await _save_progress(session_id, steps=steps, files_scanned=files_scanned)
        await _wipe_existing_nodes(source_id)
        await _wipe_pending_discoveries(source_id)
        edges_inserted, nodes_inserted, _ = await _persist_nodes_and_edges(
            source_id=source_id,
            nodes=scan_result.get("nodes") or [],
            edges=scan_result.get("edges") or [],
        )
        new_discoveries = await _persist_discoveries(
            source_id, workspace_id, scan_result.get("discoveries") or [],
        )
        _set_step(steps, "PERSIST", "done",
                  f"Saved {nodes_inserted} nodes, {new_discoveries} new discoveries")
        await _save_progress(
            session_id, steps=steps,
            files_scanned=files_scanned, edges_found=edges_inserted,
            discoveries_found=new_discoveries, errors=scan_errors,
        )
    return files_scanned, edges_inserted, scan_errors, scan_result.get("discoveries") or []

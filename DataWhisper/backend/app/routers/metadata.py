import json
import logging
import math
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.db import get_prisma, prisma
from app.deps import get_current_user, require_connection_manager
from app.schemas.metadata import MetadataOut, ScanResponse
from app.services.audit import log_audit
from app.services.lineage_builder import build_lineage_from_fks
from app.services.lineage_infer import infer_join_candidates
from app.services.lineage_read import adjacency_from_edges, merge_fk_and_inferred
from app.services.metadata_scanner import scan_metadata
from app.services.data_scope import driver_config
from app.utils.encrypt import decrypt_json

router = APIRouter(prefix="/metadata", tags=["metadata"])
logger = logging.getLogger(__name__)


def _json_default(o: Any) -> Any:
    if isinstance(o, bytes):
        return o.hex()
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, tuple):
        return list(o)
    return str(o)


def _jsonb_param(value: Any) -> str:
    """Postgres jsonb text for execute_raw — avoids Prisma GraphQL Json encoding (breaks on `schema.table` dots)."""
    clean = _prisma_json_safe(value)
    return json.dumps(clean, ensure_ascii=True, default=_json_default)


def _scrub_non_finite(obj: Any) -> Any:
    """GraphQL/JSON encoders reject NaN/Inf; nested structures can appear in scanned metadata."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {str(k): _scrub_non_finite(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_scrub_non_finite(x) for x in obj]
    return obj


def _metadata_for_persist(meta: dict[str, Any]) -> dict[str, Any]:
    """
    Persist schema + a small sample (max 3 rows) per table.
    Samples are JSON-safe (serialised by the scanner).  We persist via raw SQL
    (_jsonb_param) so Prisma GraphQL escaping issues don't apply.
    """
    tables_out: list[dict[str, Any]] = []
    for t in meta.get("tables") or []:
        if not isinstance(t, dict):
            continue
        slim = dict(t)
        samples = t.get("sample_rows") or []
        slim["sample_rows"] = samples[:3]
        tables_out.append(slim)
    return {**meta, "tables": tables_out}


def _prisma_json_safe(value: Any) -> Any:
    """Prisma Json columns need plain JSON types; round-trip avoids driver leftovers."""
    scrubbed = _scrub_non_finite(value)
    return json.loads(json.dumps(scrubbed, default=_json_default, ensure_ascii=True))


async def _get_connection_in_workspace(connection_id: uuid.UUID, workspace_id: str):
    conn = await prisma.dbconnection.find_first(
        where={"id": str(connection_id), "workspaceId": str(workspace_id)}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


def _json_to_dict(val: Any) -> dict:
    if isinstance(val, dict):
        return val
    return {}


def _json_to_list(val: Any) -> list:
    if isinstance(val, list):
        return val
    return []


@router.get("/{connection_id}", response_model=MetadataOut)
async def get_metadata(
    connection_id: uuid.UUID,
    user=Depends(get_current_user),
    version: int | None = None,
):
    await _get_connection_in_workspace(connection_id, str(user.workspaceId))

    if version is not None:
        mv = await prisma.metadataversion.find_first(
            where={"connectionId": str(connection_id), "version": version},
            include={"lineageEdges": True},
        )
    else:
        mv = await prisma.metadataversion.find_first(
            where={"connectionId": str(connection_id)},
            order={"version": "desc"},
            include={"lineageEdges": True},
        )

    if not mv:
        raise HTTPException(status_code=404, detail="No metadata scan for this connection")

    meta = _json_to_dict(mv.metadataJson)
    return MetadataOut(
        connection_id=connection_id,
        version=mv.version,
        metadata=meta,
        lineage_adjacency=_json_to_dict(mv.lineageAdjacency),
        fact_tables=_json_to_list(mv.factTables),
        dimension_tables=_json_to_list(mv.dimensionTables),
        scanned_at=mv.scannedAt,
    )


@router.post("/{connection_id}/scan", response_model=ScanResponse)
async def scan_metadata_endpoint(connection_id: uuid.UUID, user=Depends(require_connection_manager)):
    conn = await _get_connection_in_workspace(connection_id, str(user.workspaceId))
    cfg = driver_config(decrypt_json(conn.encryptedConfig))

    try:
        meta = await scan_metadata(conn.type, cfg)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Scan failed: {e}") from e

    tables = meta.get("tables") or []
    edges, _adj_fk_only, facts, dims = build_lineage_from_fks(tables)
    inferred = infer_join_candidates(tables)
    merged_edges = merge_fk_and_inferred(edges, inferred)
    full_adjacency = adjacency_from_edges(merged_edges)

    # Lineage is derived from full in-memory scan (includes samples); persist slim metadata only.
    safe_meta = _metadata_for_persist(meta)
    safe_meta["inferred_lineage_edges"] = _prisma_json_safe(inferred)
    safe_meta = _prisma_json_safe(safe_meta)
    safe_adj = _prisma_json_safe(full_adjacency)
    safe_facts = _prisma_json_safe(facts or [])
    safe_dims = _prisma_json_safe(dims or [])

    insert_metadata_sql = """
    INSERT INTO metadata_versions (id, connection_id, version, metadata_json, lineage_adjacency, fact_tables, dimension_tables)
    VALUES ($1::uuid, $2::uuid, $3::int, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)
    """
    insert_edge_sql = """
    INSERT INTO lineage_edges (id, metadata_version_id, from_table, to_table, fk_column, referenced_column)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
    """

    p = get_prisma()
    try:
        last = await p.metadataversion.find_first(
            where={"connectionId": str(conn.id)},
            order={"version": "desc"},
        )
        next_ver = (int(last.version) if last else 0) + 1
        mv_id = str(uuid.uuid4())
        # Raw SQL: Prisma GraphQL mutations embed Json inline; `catalog.schema.table` keys → "bare '.'" parse errors.
        await p.execute_raw(
            insert_metadata_sql,
            mv_id,
            str(conn.id),
            next_ver,
            _jsonb_param(safe_meta),
            _jsonb_param(safe_adj),
            _jsonb_param(safe_facts),
            _jsonb_param(safe_dims),
        )
        for e in edges:
            await p.execute_raw(
                insert_edge_sql,
                str(uuid.uuid4()),
                mv_id,
                str(e["from_table"]),
                str(e["to_table"]),
                str(e["fk_column"]),
                str(e["referenced_column"]),
            )
    except Exception as e:
        logger.exception("Failed to persist metadata scan for connection %s", conn.id)
        raise HTTPException(
            status_code=500,
            detail=f"Scan completed but saving results failed: {e!s}. Check server logs for details.",
        ) from e

    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "metadata.scan",
        resource_type="connection",
        resource_id=str(connection_id),
        detail={
            "version": next_ver,
            "tables": len(meta.get("tables", [])),
            "fk_edges": len(edges),
            "inferred_edges": len(inferred),
        },
    )
    return ScanResponse(version=next_ver, tables_scanned=len(meta.get("tables", [])), edges=len(merged_edges))

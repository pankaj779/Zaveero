import json
import logging
import math
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.db import prisma
from app.deps import get_current_user, require_connection_manager
from app.schemas.metadata import MetadataOut, ScanResponse
from app.services.metadata_pipeline import run_metadata_scan_for_connection

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
    await _get_connection_in_workspace(connection_id, str(user.workspaceId))
    try:
        result = await run_metadata_scan_for_connection(
            str(connection_id),
            str(user.workspaceId),
            str(user.id),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Scan failed: {e}") from e
    return ScanResponse(
        version=result["version"],
        tables_scanned=result["tables_scanned"],
        edges=result["edges"],
    )

"""Run and persist metadata scans (shared by Connections API and discovery connect)."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from app.db import get_prisma, prisma
from app.services.audit import log_audit
from app.services.data_scope import driver_config
from app.services.lineage_builder import build_lineage_from_fks
from app.services.lineage_infer import infer_join_candidates
from app.services.lineage_read import adjacency_from_edges, merge_fk_and_inferred
from app.services.metadata_persist import jsonb_param, metadata_for_persist, prisma_json_safe
from app.services.metadata_scanner import scan_metadata
from app.utils.encrypt import decrypt_json

logger = logging.getLogger(__name__)


async def run_metadata_scan_for_connection(
    connection_id: str,
    workspace_id: str,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Scan warehouse metadata, build lineage, persist metadata_versions."""
    conn = await prisma.dbconnection.find_first(
        where={"id": connection_id, "workspaceId": workspace_id}
    )
    if not conn:
        raise ValueError("Connection not found")

    cfg = driver_config(decrypt_json(conn.encryptedConfig))
    try:
        meta = await scan_metadata(conn.type, cfg)
    except Exception as e:
        logger.exception("Metadata scan failed for connection %s", connection_id)
        raise

    tables = meta.get("tables") or []
    edges, _adj_fk_only, facts, dims = build_lineage_from_fks(tables)
    inferred = infer_join_candidates(tables)
    merged_edges = merge_fk_and_inferred(edges, inferred)
    full_adjacency = adjacency_from_edges(merged_edges)

    safe_meta = metadata_for_persist(meta)
    safe_meta["inferred_lineage_edges"] = prisma_json_safe(inferred)
    safe_meta = prisma_json_safe(safe_meta)
    safe_adj = prisma_json_safe(full_adjacency)
    safe_facts = prisma_json_safe(facts or [])
    safe_dims = prisma_json_safe(dims or [])

    insert_metadata_sql = """
    INSERT INTO metadata_versions (id, connection_id, version, metadata_json, lineage_adjacency, fact_tables, dimension_tables)
    VALUES ($1::uuid, $2::uuid, $3::int, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)
    """
    insert_edge_sql = """
    INSERT INTO lineage_edges (id, metadata_version_id, from_table, to_table, fk_column, referenced_column)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
    """

    p = get_prisma()
    last = await p.metadataversion.find_first(
        where={"connectionId": str(conn.id)},
        order={"version": "desc"},
    )
    next_ver = (int(last.version) if last else 0) + 1
    mv_id = str(uuid.uuid4())
    await p.execute_raw(
        insert_metadata_sql,
        mv_id,
        str(conn.id),
        next_ver,
        jsonb_param(safe_meta),
        jsonb_param(safe_adj),
        jsonb_param(safe_facts),
        jsonb_param(safe_dims),
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

    if user_id:
        await log_audit(
            workspace_id,
            user_id,
            "metadata.scan",
            resource_type="connection",
            resource_id=str(connection_id),
            detail={
                "version": next_ver,
                "tables": len(tables),
                "fk_edges": len(edges),
                "inferred_edges": len(inferred),
                "auto": True,
            },
        )

    logger.info(
        "Metadata scan v%s for connection %s: %s tables, %s FK edges, %s inferred",
        next_ver,
        connection_id,
        len(tables),
        len(edges),
        len(inferred),
    )
    return {
        "version": next_ver,
        "tables_scanned": len(tables),
        "edges": len(merged_edges),
    }

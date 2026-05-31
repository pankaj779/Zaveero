from typing import Any

from fastapi import HTTPException

from app.db import prisma
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.services.ai_generator import explain_sql
from app.services.catalog_queries import list_tables_from_metadata
from app.services.confidence import compute_confidence
from app.services.db_executor import run_query
from app.services.query_cache import get_cached, set_cached
from app.services.result_insight import generate_insight
from app.services.data_scope import apply_ai_data_scope, driver_config
from app.services.lineage_read import get_merged_edges_from_mv
from app.services.sql_validator import validate_safety, validate_sql
from app.services.usage_tracking import record_execution
from app.utils.encrypt import decrypt_json


def _json_dict(val: Any) -> dict:
    return val if isinstance(val, dict) else {}


async def run_execute_request(user, body: ExecuteRequest, *, persist_history: bool = True) -> ExecuteResponse:
    conn = await prisma.dbconnection.find_first(
        where={"id": str(body.connection_id), "workspaceId": str(user.workspaceId)}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    mv = await prisma.metadataversion.find_first(
        where={"connectionId": str(conn.id)},
        order={"version": "desc"},
        include={"lineageEdges": True},
    )
    if not mv:
        raise HTTPException(status_code=400, detail="No metadata for this connection. Run scan first.")

    meta = _json_dict(mv.metadataJson)
    db_edges = get_merged_edges_from_mv(mv)
    conn_cfg = decrypt_json(conn.encryptedConfig)
    meta, edges, _scope = apply_ai_data_scope(meta, db_edges, conn_cfg, [])
    edges_core = [
        {k: e[k] for k in ("from_table", "to_table", "fk_column", "referenced_column") if k in e}
        for e in edges
    ]
    if not (meta.get("tables") or []):
        raise HTTPException(
            status_code=400,
            detail="No tables remain after applying ai_data_scope. Adjust scope on this connection.",
        )
    # Safety checks always enforced (no DML/DDL, read-only, single statement)
    safe_ok, safe_errs = validate_safety(body.sql)
    if not safe_ok:
        raise HTTPException(status_code=400, detail={"message": "SQL safety check failed", "errors": safe_errs})

    if not body.skip_validation:
        ok, errs = validate_sql(body.sql, meta, edges_core)
        if not ok:
            raise HTTPException(status_code=400, detail={"message": "SQL validation failed", "errors": errs})

    cfg = driver_config(conn_cfg)

    # Catalog questions ("list tables in schema") — answer from scanned metadata when possible
    catalog_result = list_tables_from_metadata(
        meta, question=body.question, sql=body.sql, max_rows=500
    )
    if catalog_result is not None:
        explanation = catalog_result.get("explanation") or ""
        conf = 0.95 if catalog_result["row_count"] else 0.7
        insight = generate_insight(body.question, catalog_result["columns"], catalog_result["rows"])
        if persist_history:
            await prisma.queryhistory.create(
                data={
                    "workspaceId": str(user.workspaceId),
                    "userId": str(user.id),
                    "connectionId": str(conn.id),
                    "metadataVersionId": str(mv.id),
                    "question": body.question or "",
                    "sqlText": body.sql,
                    "resultRowCount": catalog_result["row_count"],
                    "chartType": catalog_result["chart_type"],
                    "explanation": explanation or None,
                    "confidenceScore": conf,
                }
            )
            await record_execution(str(user.id), str(user.workspaceId))
        return ExecuteResponse(
            columns=catalog_result["columns"],
            rows=catalog_result["rows"],
            chart_type=catalog_result["chart_type"],
            row_count=catalog_result["row_count"],
            sql=body.sql,
            explanation=explanation or None,
            insight=insight or None,
            confidence=conf,
            metadata_version_id=mv.id,
        )

    # Check cache first
    cached = get_cached(str(conn.id), body.sql)
    if cached:
        result = cached
    else:
        try:
            result = await run_query(
                conn.type, cfg, body.sql, max_rows=500, chart_preference=body.chart_preference
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Execution failed: {e}") from e
        set_cached(str(conn.id), body.sql, result)

    explanation = ""
    try:
        explanation = explain_sql(body.sql, meta)
    except Exception:
        explanation = ""

    conf = compute_confidence(body.sql, meta, edges_core, True, [])
    insight = generate_insight(body.question, result["columns"], result["rows"])

    if persist_history:
        await prisma.queryhistory.create(
            data={
                "workspaceId": str(user.workspaceId),
                "userId": str(user.id),
                "connectionId": str(conn.id),
                "metadataVersionId": str(mv.id),
                "question": body.question or "",
                "sqlText": body.sql,
                "resultRowCount": result["row_count"],
                "chartType": result["chart_type"],
                "explanation": explanation or None,
                "confidenceScore": conf,
            }
        )
        await record_execution(str(user.id), str(user.workspaceId))

    return ExecuteResponse(
        columns=result["columns"],
        rows=result["rows"],
        chart_type=result["chart_type"],
        row_count=result["row_count"],
        sql=body.sql,
        explanation=explanation or None,
        insight=insight or None,
        confidence=conf,
        metadata_version_id=mv.id,
    )

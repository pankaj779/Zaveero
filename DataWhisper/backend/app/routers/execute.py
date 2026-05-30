import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db import prisma
from app.deps import require_sql_runner
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.services.audit import log_audit
from app.services.db_executor import run_query
from app.services.query_runner import run_execute_request
from app.services.rate_limiter import check_exec_rate
from app.services.data_scope import driver_config, read_ai_data_scope, table_passes_scope
from app.utils.encrypt import decrypt_json

router = APIRouter(prefix="/execute", tags=["execute"])


@router.post("", response_model=ExecuteResponse)
async def execute_query(body: ExecuteRequest, user=Depends(require_sql_runner)):
    check_exec_rate(str(user.workspaceId))
    out = await run_execute_request(user, body, persist_history=True)
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "sql.execute",
        resource_type="connection",
        resource_id=str(body.connection_id),
        detail={"row_count": out.row_count, "chart_type": out.chart_type},
    )
    return out


class PreviewResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    table_name: str


@router.get("/preview/{connection_id}/{table_name:path}", response_model=PreviewResponse)
async def preview_table(
    connection_id: uuid.UUID,
    table_name: str,
    limit: int = Query(default=20, ge=1, le=100),
    user=Depends(require_sql_runner),
):
    """Quick data preview — returns N rows from a table without AI."""
    conn = await prisma.dbconnection.find_first(
        where={"id": str(connection_id), "workspaceId": str(user.workspaceId)}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    mv = await prisma.metadataversion.find_first(
        where={"connectionId": str(conn.id)},
        order={"version": "desc"},
    )
    if not mv:
        raise HTTPException(status_code=400, detail="No metadata. Run scan first.")

    meta = mv.metadataJson if isinstance(mv.metadataJson, dict) else {}
    known_tables = {t["name"] for t in meta.get("tables", []) if isinstance(t, dict)}
    if table_name not in known_tables:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not in scanned metadata.")

    full_cfg = decrypt_json(conn.encryptedConfig)
    if not table_passes_scope(table_name, read_ai_data_scope(full_cfg)):
        raise HTTPException(
            status_code=404,
            detail=f"Table '{table_name}' is excluded by this connection's ai_data_scope.",
        )

    ct = conn.type.upper()
    if ct == "SQLSERVER":
        sql = f"SELECT TOP {limit} * FROM [{table_name.replace('.', '].[')}]"
    else:
        sql = f"SELECT * FROM {table_name} LIMIT {limit}"

    cfg = driver_config(full_cfg)
    try:
        result = await run_query(conn.type, cfg, sql, max_rows=limit)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preview failed: {e}") from e

    return PreviewResponse(
        columns=result["columns"],
        rows=result["rows"],
        row_count=result["row_count"],
        table_name=table_name,
    )

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import prisma
from app.deps import get_current_user
from app.services.ai_generator import explain_sql
from app.services.data_scope import apply_ai_data_scope
from app.services.lineage_read import get_merged_edges_from_mv
from app.utils.encrypt import decrypt_json

router = APIRouter(prefix="/sql", tags=["sql"])


def _json_dict(val: Any) -> dict:
    return val if isinstance(val, dict) else {}


class ExplainSqlBody(BaseModel):
    connection_id: uuid.UUID
    sql: str = Field(min_length=1, max_length=200_000)


@router.post("/explain")
async def explain_sql_endpoint(body: ExplainSqlBody, user=Depends(get_current_user)):
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
        raise HTTPException(status_code=400, detail="Run a metadata scan first.")
    meta = _json_dict(mv.metadataJson)
    conn_cfg = decrypt_json(conn.encryptedConfig)

    db_edges = get_merged_edges_from_mv(mv)
    meta, _, _ = apply_ai_data_scope(meta, db_edges, conn_cfg, [])
    try:
        text = explain_sql(body.sql, meta)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"explanation": text}

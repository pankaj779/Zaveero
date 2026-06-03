"""Databricks connection management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.databricks.sql_client import sql_connection_with_settings
from app.deps import get_current_user
from app.services import tenant_store

router = APIRouter(prefix="/connections", tags=["connections"])


class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    host: str = Field(min_length=3)
    http_path: str = Field(min_length=3)
    workspace_id_dbx: str = Field(min_length=1)
    sql_token: str = Field(min_length=10)
    gateway_token: str = ""
    inference_schema: str = ""
    inference_time_column: str = "event_time"
    inference_table_suffix: str = "_payload"
    benchmark_enabled: bool = True
    exclude_test_requests: bool = True
    set_as_active: bool = True


class ConnectionUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    http_path: str | None = None
    workspace_id_dbx: str | None = None
    sql_token: str | None = None
    gateway_token: str | None = None
    inference_schema: str | None = None
    inference_time_column: str | None = None
    inference_table_suffix: str | None = None
    benchmark_enabled: bool | None = None
    exclude_test_requests: bool | None = None


class ConnectionTest(BaseModel):
    host: str
    http_path: str
    sql_token: str


@router.get("")
def list_connections(user=Depends(get_current_user)):
    return {"connections": tenant_store.list_connections(user["workspace_id"])}


@router.post("")
def create_connection(body: ConnectionCreate, user=Depends(get_current_user)):
    conn = tenant_store.create_connection(
        workspace_id=user["workspace_id"],
        name=body.name,
        host=body.host,
        http_path=body.http_path,
        workspace_id_dbx=body.workspace_id_dbx,
        sql_token=body.sql_token,
        gateway_token=body.gateway_token,
        inference_schema=body.inference_schema,
        inference_time_column=body.inference_time_column,
        inference_table_suffix=body.inference_table_suffix,
        benchmark_enabled=body.benchmark_enabled,
        exclude_test_requests=body.exclude_test_requests,
        is_default=True,
    )
    if body.set_as_active:
        tenant_store.set_active_connection(user["id"], conn["id"])
    return conn


@router.post("/test")
def test_connection(body: ConnectionTest, user=Depends(get_current_user)):
    host = body.host.replace("https://", "").replace("http://", "").strip().rstrip("/")
    http_path = body.http_path.strip()
    token = body.sql_token.strip()
    if not host:
        return {"ok": False, "message": "Databricks host is required"}
    if not http_path:
        return {"ok": False, "message": "SQL warehouse HTTP path is required"}
    if not http_path.startswith("/"):
        http_path = f"/{http_path}"
    if not token:
        return {"ok": False, "message": "SQL PAT is required"}

    # Build settings from form fields (not empty server .env placeholders)
    tmp = Settings.model_validate(
        {
            "databricks_host": host,
            "databricks_http_path": http_path,
            "databricks_token": token,
        }
    )
    try:
        with sql_connection_with_settings(tmp) as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
        return {"ok": True, "message": "Connection successful"}
    except Exception as e:
        return {"ok": False, "message": str(e)[:500]}


@router.patch("/{connection_id}")
def update_connection(connection_id: str, body: ConnectionUpdate, user=Depends(get_current_user)):
    data = body.model_dump(exclude_unset=True)
    updated = tenant_store.update_connection(connection_id, user["workspace_id"], **data)
    if not updated:
        raise HTTPException(status_code=404, detail="Connection not found")
    return updated


@router.delete("/{connection_id}")
def delete_connection(connection_id: str, user=Depends(get_current_user)):
    if not tenant_store.delete_connection(connection_id, user["workspace_id"]):
        raise HTTPException(status_code=404, detail="Connection not found")
    if user.get("active_connection_id") == connection_id:
        tenant_store.set_active_connection(user["id"], None)
    return {"ok": True}


@router.post("/{connection_id}/activate")
def activate_connection(connection_id: str, user=Depends(get_current_user)):
    conn = tenant_store.get_connection(connection_id, user["workspace_id"])
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    tenant_store.set_active_connection(user["id"], connection_id)
    return {"ok": True, "active_connection_id": connection_id}


@router.get("/active/status")
def active_connection_status(user=Depends(get_current_user)):
    conn = tenant_store.resolve_user_connection(user)
    if not conn:
        return {"configured": False, "connection": None}
    return {
        "configured": True,
        "connection": tenant_store.connection_public(conn.id),
    }

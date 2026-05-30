"""Monitored agents (replay targets) per Databricks connection."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import get_current_user, require_connection
from app.services import tenant_store

router = APIRouter(prefix="/monitored-agents", tags=["monitored-agents"])


class AgentCreate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    route_model: str = Field(min_length=1, max_length=200)
    gateway_url: str = Field(min_length=8)
    inference_table_fqn: str = ""
    enabled: bool = True
    sort_order: int = 0


class AgentUpdate(BaseModel):
    label: str | None = None
    route_model: str | None = None
    gateway_url: str | None = None
    inference_table_fqn: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class GatewayAlias(BaseModel):
    display: str
    route: str


def _active_connection_id(user: dict) -> str:
    conn = tenant_store.resolve_user_connection(user)
    if not conn:
        raise HTTPException(status_code=428, detail="Connect Databricks first")
    return conn.id


@router.get("")
def list_agents(user=Depends(require_connection)):
    cid = _active_connection_id(user)
    return {"agents": tenant_store.list_monitored_agents(cid), "connection_id": cid}


@router.post("")
def create_agent(body: AgentCreate, user=Depends(require_connection)):
    cid = _active_connection_id(user)
    agent = tenant_store.create_monitored_agent(
        connection_id=cid,
        label=body.label,
        route_model=body.route_model,
        gateway_url=body.gateway_url,
        inference_table_fqn=body.inference_table_fqn,
        enabled=body.enabled,
        sort_order=body.sort_order,
    )
    return agent


@router.patch("/{agent_id}")
def update_agent(agent_id: str, body: AgentUpdate, user=Depends(require_connection)):
    cid = _active_connection_id(user)
    updated = tenant_store.update_monitored_agent(agent_id, cid, **body.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")
    return updated


@router.delete("/{agent_id}")
def delete_agent(agent_id: str, user=Depends(require_connection)):
    cid = _active_connection_id(user)
    if not tenant_store.delete_monitored_agent(agent_id, cid):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"ok": True}


@router.get("/gateway-aliases")
def list_aliases(user=Depends(require_connection)):
    cid = _active_connection_id(user)
    return {"aliases": tenant_store.list_gateway_aliases(cid)}


@router.put("/gateway-aliases")
def replace_aliases(aliases: list[GatewayAlias], user=Depends(require_connection)):
    cid = _active_connection_id(user)
    tenant_store.replace_gateway_aliases(cid, [a.model_dump() for a in aliases])
    return {"aliases": tenant_store.list_gateway_aliases(cid)}

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import prisma
from app.deps import get_current_user, require_connection_manager
from app.services.audit import log_audit
from app.schemas.connection import ConnectionCreate, ConnectionOut, ConnectionTest
from app.services.data_scope import driver_config
from app.utils.db_clients import test_connection
from app.utils.encrypt import encrypt_json

router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("", response_model=list[ConnectionOut])
async def list_connections(user=Depends(get_current_user)):
    rows = await prisma.dbconnection.find_many(
        where={"workspaceId": str(user.workspaceId)},
        order={"createdAt": "desc"},
    )
    return [
        ConnectionOut(
            id=uuid.UUID(r.id),
            workspace_id=uuid.UUID(r.workspaceId),
            name=r.name,
            type=r.type,
            created_at=r.createdAt,
            updated_at=r.updatedAt,
        )
        for r in rows
    ]


@router.post("", response_model=ConnectionOut)
async def create_connection(body: ConnectionCreate, user=Depends(require_connection_manager)):
    enc = encrypt_json(body.config)
    conn = await prisma.dbconnection.create(
        data={
            "workspaceId": str(user.workspaceId),
            "name": body.name,
            "type": body.type,
            "encryptedConfig": enc,
        }
    )
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "connection.create",
        resource_type="connection",
        resource_id=str(conn.id),
        detail={"name": body.name, "type": body.type},
    )
    return ConnectionOut(
        id=uuid.UUID(conn.id),
        workspace_id=uuid.UUID(conn.workspaceId),
        name=conn.name,
        type=conn.type,
        created_at=conn.createdAt,
        updated_at=conn.updatedAt,
    )


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(connection_id: uuid.UUID, user=Depends(require_connection_manager)):
    conn = await prisma.dbconnection.find_first(
        where={"id": str(connection_id), "workspaceId": str(user.workspaceId)}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await prisma.dbconnection.delete(where={"id": conn.id})
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "connection.delete",
        resource_type="connection",
        resource_id=str(connection_id),
    )


@router.post("/test")
async def test_conn(body: ConnectionTest, user=Depends(require_connection_manager)):
    try:
        await test_connection(body.type, driver_config(body.config))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"ok": True}

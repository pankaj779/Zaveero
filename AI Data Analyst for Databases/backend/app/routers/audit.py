import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.db import prisma
from app.deps import require_workspace_admin

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit(user=Depends(require_workspace_admin), limit: int = 200):
    rows = await prisma.auditlog.find_many(
        where={"workspaceId": str(user.workspaceId)},
        order={"createdAt": "desc"},
        take=min(limit, 1000),
    )
    return [
        {
            "id": r.id,
            "workspace_id": r.workspaceId,
            "user_id": r.userId,
            "action": r.action,
            "resource_type": r.resourceType,
            "resource_id": r.resourceId,
            "detail": r.detail,
            "ip_address": r.ipAddress,
            "created_at": r.createdAt.isoformat(),
        }
        for r in rows
    ]


@router.delete("/{log_id}")
async def delete_audit_entry(log_id: uuid.UUID, user=Depends(require_workspace_admin)):
    row = await prisma.auditlog.find_first(
        where={"id": str(log_id), "workspaceId": str(user.workspaceId)}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    await prisma.auditlog.delete(where={"id": str(log_id)})
    return {"ok": True}

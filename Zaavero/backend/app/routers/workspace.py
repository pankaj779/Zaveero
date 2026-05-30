"""Workspace and team management."""

from fastapi import APIRouter, Depends, HTTPException

from app.db import prisma
from app.deps import get_current_user, require_admin
from app.schemas.platform import (
    InviteMemberRequest,
    UpdateMemberRoleRequest,
    WorkspaceMemberOut,
    WorkspaceSettingsUpdate,
)
from app.services.activity import log_activity
from app.services.passwords import hash_password
from app.services.roles import normalize_role

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/members", response_model=list[WorkspaceMemberOut])
async def list_members(user=Depends(get_current_user)):
    members = await prisma.user.find_many(
        where={"workspaceId": str(user.workspaceId)},
        order={"createdAt": "asc"},
    )
    return [
        WorkspaceMemberOut(
            id=str(m.id),
            email=m.email,
            name=m.name,
            role=m.role,
            created_at=m.createdAt,
        )
        for m in members
    ]


@router.patch("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    body: UpdateMemberRoleRequest,
    admin=Depends(require_admin),
):
    member = await prisma.user.find_first(
        where={"id": member_id, "workspaceId": str(admin.workspaceId)},
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if str(member.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    role = normalize_role(body.role)
    updated = await prisma.user.update(where={"id": member_id}, data={"role": role})
    await log_activity(
        workspace_id=str(admin.workspaceId),
        user_id=str(admin.id),
        action="member.role_updated",
        resource_type="user",
        resource_id=member_id,
        metadata={"new_role": role},
    )
    return WorkspaceMemberOut(
        id=str(updated.id),
        email=updated.email,
        name=updated.name,
        role=updated.role,
        created_at=updated.createdAt,
    )


@router.delete("/members/{member_id}")
async def remove_member(member_id: str, admin=Depends(require_admin)):
    member = await prisma.user.find_first(
        where={"id": member_id, "workspaceId": str(admin.workspaceId)},
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if str(member.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    await prisma.user.delete(where={"id": member_id})
    await log_activity(
        workspace_id=str(admin.workspaceId),
        user_id=str(admin.id),
        action="member.removed",
        resource_type="user",
        resource_id=member_id,
    )
    return {"ok": True}


@router.patch("/settings")
async def update_workspace_settings(body: WorkspaceSettingsUpdate, admin=Depends(require_admin)):
    data = {}
    if body.name is not None:
        data["name"] = body.name
    if body.allow_self_serve_join is not None:
        data["allowSelfServeJoin"] = body.allow_self_serve_join
    if body.default_join_role is not None:
        data["defaultJoinRole"] = normalize_role(body.default_join_role)

    if not data:
        raise HTTPException(status_code=400, detail="No changes provided")

    ws = await prisma.workspace.update(where={"id": str(admin.workspaceId)}, data=data)
    return {"id": str(ws.id), "name": ws.name, "slug": ws.slug}

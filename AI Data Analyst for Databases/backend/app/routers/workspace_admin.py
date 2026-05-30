import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import prisma
from app.deps import get_current_user, require_workspace_admin
from app.routers.auth import hash_password, normalize_email
from app.schemas.auth import UserOut, WorkspaceOut
from app.schemas.workspace_admin import (
    InviteMemberRequest,
    MemberOut,
    MemberRolePatch,
    WorkspacePoliciesOut,
    WorkspaceSettingsPatch,
)
from app.services.audit import log_audit
from app.services.roles import ROLE_ADMIN, is_admin

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/lookup")
async def lookup_workspace(slug: str):
    """Public: confirm workspace exists and whether slug join is open (for login UI)."""
    ws = await prisma.workspace.find_unique(where={"slug": slug.strip().lower()})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {
        "name": ws.name,
        "slug": ws.slug,
        "allow_self_serve_join": ws.allowSelfServeJoin,
        "default_join_role": ws.defaultJoinRole or "ANALYST",
    }


def _policies_from_ws(ws) -> WorkspacePoliciesOut:
    return WorkspacePoliciesOut(
        allow_self_serve_join=ws.allowSelfServeJoin,
        default_join_role=ws.defaultJoinRole or "ANALYST",
        analysts_can_manage_connections=ws.analystsCanManageConnections,
    )


@router.get("/me")
async def workspace_me(user=Depends(get_current_user)):
    ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if not ws:
        raise HTTPException(status_code=500, detail="Workspace missing")
    return {
        "user": UserOut(
            id=uuid.UUID(user.id),
            email=user.email,
            role=user.role,
            workspace_id=uuid.UUID(user.workspaceId),
        ),
        "workspace": WorkspaceOut(
            id=uuid.UUID(ws.id),
            name=ws.name,
            slug=ws.slug,
        ),
        "policies": _policies_from_ws(ws).model_dump(),
        "is_workspace_admin": is_admin(user.role),
    }


@router.get("/settings", response_model=WorkspacePoliciesOut)
async def get_workspace_settings(user=Depends(require_workspace_admin)):
    ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _policies_from_ws(ws)


@router.patch("/settings", response_model=WorkspacePoliciesOut)
async def patch_workspace_settings(body: WorkspaceSettingsPatch, user=Depends(require_workspace_admin)):
    ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    data: dict = {}
    if body.allow_self_serve_join is not None:
        data["allowSelfServeJoin"] = body.allow_self_serve_join
    if body.default_join_role is not None:
        data["defaultJoinRole"] = body.default_join_role
    if body.analysts_can_manage_connections is not None:
        data["analystsCanManageConnections"] = body.analysts_can_manage_connections
    if not data:
        return _policies_from_ws(ws)
    updated = await prisma.workspace.update(where={"id": str(ws.id)}, data=data)
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "workspace.settings_update",
        resource_type="workspace",
        resource_id=str(ws.id),
        detail=data,
    )
    return _policies_from_ws(updated)


@router.get("/members", response_model=list[MemberOut])
async def list_members(user=Depends(require_workspace_admin)):
    rows = await prisma.user.find_many(
        where={"workspaceId": str(user.workspaceId)},
        order={"createdAt": "asc"},
    )
    return [
        MemberOut(
            id=uuid.UUID(r.id),
            email=r.email,
            role=r.role,
            created_at=r.createdAt.isoformat(),
        )
        for r in rows
    ]


@router.post("/members", response_model=MemberOut)
async def invite_member(body: InviteMemberRequest, user=Depends(require_workspace_admin)):
    email = normalize_email(str(body.email))
    existing = await prisma.user.find_unique(where={"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    u = await prisma.user.create(
        data={
            "email": email,
            "passwordHash": hash_password(body.password),
            "role": body.role,
            "workspaceId": str(user.workspaceId),
        }
    )
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "workspace.member_invite",
        resource_type="user",
        resource_id=str(u.id),
        detail={"email": email, "role": body.role},
    )
    return MemberOut(
        id=uuid.UUID(u.id),
        email=u.email,
        role=u.role,
        created_at=u.createdAt.isoformat(),
    )


@router.patch("/members/{member_id}", response_model=MemberOut)
async def update_member_role(member_id: uuid.UUID, body: MemberRolePatch, user=Depends(require_workspace_admin)):
    if member_id == uuid.UUID(user.id):
        if body.role != ROLE_ADMIN:
            admin_count = await prisma.user.count(
                where={"workspaceId": str(user.workspaceId), "role": ROLE_ADMIN}
            )
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot demote the only workspace admin",
                )

    row = await prisma.user.find_first(
        where={"id": str(member_id), "workspaceId": str(user.workspaceId)}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    if body.role != ROLE_ADMIN and row.role == ROLE_ADMIN:
        admin_count = await prisma.user.count(
            where={"workspaceId": str(user.workspaceId), "role": ROLE_ADMIN}
        )
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last workspace admin")

    updated = await prisma.user.update(where={"id": row.id}, data={"role": body.role})
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "workspace.member_role",
        resource_type="user",
        resource_id=str(member_id),
        detail={"new_role": body.role},
    )
    return MemberOut(
        id=uuid.UUID(updated.id),
        email=updated.email,
        role=updated.role,
        created_at=updated.createdAt.isoformat(),
    )


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(member_id: uuid.UUID, user=Depends(require_workspace_admin)):
    if member_id == uuid.UUID(user.id):
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    row = await prisma.user.find_first(
        where={"id": str(member_id), "workspaceId": str(user.workspaceId)}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    if row.role == ROLE_ADMIN:
        admin_count = await prisma.user.count(
            where={"workspaceId": str(user.workspaceId), "role": ROLE_ADMIN}
        )
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last workspace admin")

    await prisma.user.delete(where={"id": row.id})
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "workspace.member_remove",
        resource_type="user",
        resource_id=str(member_id),
        detail={"email": row.email},
    )

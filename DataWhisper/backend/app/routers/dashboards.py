import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Json

from app.db import prisma
from app.deps import get_current_user, require_sql_runner
from app.schemas.saved_assets import SavedDashboardCreate, SavedDashboardOut, SavedDashboardPatch
from app.services.audit import log_audit
from app.services.roles import is_admin

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


def _can_read_dash(user, row) -> bool:
    if str(row.workspaceId) != str(user.workspaceId):
        return False
    if is_admin(user.role):
        return True
    if str(row.userId) == str(user.id):
        return True
    return bool(row.sharedWithWorkspace)


def _can_write_dash(user, row) -> bool:
    if str(row.workspaceId) != str(user.workspaceId):
        return False
    if is_admin(user.role):
        return True
    return str(row.userId) == str(user.id)


def _order_to_list(val: Any) -> list[str]:
    if isinstance(val, list):
        return [str(x) for x in val]
    return []


@router.get("", response_model=list[SavedDashboardOut])
async def list_dashboards(user=Depends(get_current_user)):
    if is_admin(user.role):
        rows = await prisma.saveddashboard.find_many(
            where={"workspaceId": str(user.workspaceId)},
            order={"updatedAt": "desc"},
        )
    else:
        rows = await prisma.saveddashboard.find_many(
            where={
                "workspaceId": str(user.workspaceId),
                "OR": [
                    {"userId": str(user.id)},
                    {"sharedWithWorkspace": True},
                ],
            },
            order={"updatedAt": "desc"},
        )
    return [
        SavedDashboardOut(
            id=uuid.UUID(r.id),
            workspace_id=uuid.UUID(r.workspaceId),
            user_id=uuid.UUID(r.userId),
            name=r.name,
            description=r.description or "",
            report_order=_order_to_list(r.reportOrder),
            shared_with_workspace=r.sharedWithWorkspace,
            created_at=r.createdAt,
            updated_at=r.updatedAt,
        )
        for r in rows
    ]


@router.post("", response_model=SavedDashboardOut)
async def create_dashboard(body: SavedDashboardCreate, user=Depends(require_sql_runner)):
    row = await prisma.saveddashboard.create(
        data={
            "workspace": {"connect": {"id": str(user.workspaceId)}},
            "user": {"connect": {"id": str(user.id)}},
            "name": body.name,
            "description": body.description or "",
            "reportOrder": Json([str(x) for x in body.report_order]),
            "sharedWithWorkspace": body.shared_with_workspace,
        }
    )
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "dashboard.create",
        resource_type="saved_dashboard",
        resource_id=str(row.id),
        detail={"name": body.name},
    )
    return SavedDashboardOut(
        id=uuid.UUID(row.id),
        workspace_id=uuid.UUID(row.workspaceId),
        user_id=uuid.UUID(row.userId),
        name=row.name,
        description=row.description or "",
        report_order=_order_to_list(row.reportOrder),
        shared_with_workspace=row.sharedWithWorkspace,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


@router.get("/{dashboard_id}", response_model=SavedDashboardOut)
async def get_dashboard(dashboard_id: uuid.UUID, user=Depends(get_current_user)):
    row = await prisma.saveddashboard.find_first(where={"id": str(dashboard_id)})
    if not row or not _can_read_dash(user, row):
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return SavedDashboardOut(
        id=uuid.UUID(row.id),
        workspace_id=uuid.UUID(row.workspaceId),
        user_id=uuid.UUID(row.userId),
        name=row.name,
        description=row.description or "",
        report_order=_order_to_list(row.reportOrder),
        shared_with_workspace=row.sharedWithWorkspace,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


@router.patch("/{dashboard_id}", response_model=SavedDashboardOut)
async def patch_dashboard(
    dashboard_id: uuid.UUID, body: SavedDashboardPatch, user=Depends(require_sql_runner)
):
    row = await prisma.saveddashboard.find_first(where={"id": str(dashboard_id)})
    if not row or not _can_write_dash(user, row):
        raise HTTPException(status_code=404, detail="Dashboard not found")
    data: dict[str, Any] = {}
    if body.name is not None:
        data["name"] = body.name
    if body.description is not None:
        data["description"] = body.description
    if body.report_order is not None:
        data["reportOrder"] = Json([str(x) for x in body.report_order])
    if body.shared_with_workspace is not None:
        data["sharedWithWorkspace"] = body.shared_with_workspace
    updated = await prisma.saveddashboard.update(where={"id": row.id}, data=data)
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "dashboard.update",
        resource_type="saved_dashboard",
        resource_id=str(row.id),
    )
    return SavedDashboardOut(
        id=uuid.UUID(updated.id),
        workspace_id=uuid.UUID(updated.workspaceId),
        user_id=uuid.UUID(updated.userId),
        name=updated.name,
        description=updated.description or "",
        report_order=_order_to_list(updated.reportOrder),
        shared_with_workspace=updated.sharedWithWorkspace,
        created_at=updated.createdAt,
        updated_at=updated.updatedAt,
    )


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(dashboard_id: uuid.UUID, user=Depends(require_sql_runner)):
    row = await prisma.saveddashboard.find_first(where={"id": str(dashboard_id)})
    if not row or not _can_write_dash(user, row):
        raise HTTPException(status_code=404, detail="Dashboard not found")
    await prisma.saveddashboard.delete(where={"id": row.id})
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "dashboard.delete",
        resource_type="saved_dashboard",
        resource_id=str(dashboard_id),
    )

"""Activity logging for workspace audit trail."""

from typing import Any

from prisma import Json

from app.db import prisma


async def log_activity(
    *,
    workspace_id: str,
    user_id: str | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    await prisma.activitylog.create(
        data={
            "workspaceId": workspace_id,
            "userId": user_id,
            "action": action,
            "resourceType": resource_type,
            "resourceId": resource_id,
            "metadata": Json(metadata or {}),
        }
    )

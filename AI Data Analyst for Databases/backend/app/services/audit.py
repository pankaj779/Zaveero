import logging
from typing import Any

from prisma import Json

from app.db import prisma

logger = logging.getLogger(__name__)


async def log_audit(
    workspace_id: str,
    user_id: str | None,
    action: str,
    *,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    try:
        await prisma.auditlog.create(
            data={
                "workspace": {"connect": {"id": workspace_id}},
                "userId": user_id,
                "action": action,
                "resourceType": resource_type,
                "resourceId": resource_id,
                "detail": Json(detail) if detail else None,
                "ipAddress": ip_address,
            }
        )
    except Exception:
        logger.warning("audit log skipped for %s (non-fatal)", action, exc_info=True)


def client_ip_from_request(client: str | None, forwarded: str | None) -> str | None:
    if forwarded:
        return forwarded.split(",")[0].strip()
    return client

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings
from app.db import prisma
from app.services.roles import can_run_sql, is_admin

security = HTTPBearer(auto_error=False)


async def get_token_payload(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    settings = get_settings()
    try:
        return jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(payload: Annotated[dict, Depends(get_token_payload)]):
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        # Prisma query JSON must use str, not uuid.UUID (not serializable in query builder)
        uid = str(uuid.UUID(str(sub)))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await prisma.user.find_unique(where={"id": uid})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_workspace_admin(user: Annotated[object, Depends(get_current_user)]):
    if not is_admin(user.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace admin only")
    return user


async def require_sql_runner(user: Annotated[object, Depends(get_current_user)]):
    if not can_run_sql(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role cannot generate or execute SQL",
        )
    return user


async def require_connection_manager(user: Annotated[object, Depends(get_current_user)]):
    """Block viewers from creating, deleting, or testing connections."""
    if not can_run_sql(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role cannot manage database connections",
        )
    ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if (
        ws
        and not ws.analystsCanManageConnections
        and user.role != "ADMIN"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admins may manage connections and run scans",
        )
    return user

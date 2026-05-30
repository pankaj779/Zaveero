"""Auth and optional-user dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.runtime_context import connection_to_settings, set_runtime_context
from app.services import tenant_store
from app.services.tokens import decode_access_token

security = HTTPBearer(auto_error=False)
optional_security = HTTPBearer(auto_error=False)


def _apply_connection_context(user: dict) -> tuple[object, object, object] | None:
    conn = tenant_store.resolve_user_connection(user)
    if not conn:
        return None
    settings = connection_to_settings(conn, Settings())
    return set_runtime_context(settings=settings, connection_id=conn.id, user_id=user["id"])


async def get_optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(optional_security)],
) -> dict | None:
    if creds is None or creds.scheme.lower() != "bearer":
        return None
    payload = decode_access_token(creds.credentials)
    if not payload or not payload.get("sub"):
        return None
    user = tenant_store.get_user_by_id(str(payload["sub"]))
    return user


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(creds.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = tenant_store.get_user_by_id(str(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_connection(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    conn = tenant_store.resolve_user_connection(user)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Connect a Databricks workspace first",
        )
    return user

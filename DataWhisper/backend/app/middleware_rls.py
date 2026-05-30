"""Per-request DB transaction + app.workspace_id for PostgreSQL RLS (defense in depth)."""

from __future__ import annotations

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import get_settings
from app.db import workspace_transaction

# Paths that must not open an RLS transaction (no JWT / public / internal cron).
_SKIP_PATHS = frozenset(
    {
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/auth/register",
        "/auth/login",
        "/auth/join",
    }
)


def _should_skip_rls(path: str) -> bool:
    p = path.rstrip("/") or "/"
    if p in _SKIP_PATHS:
        return True
    if path.startswith("/internal"):
        return True
    if path.startswith("/docs") or path.startswith("/redoc"):
        return True
    return False


class RlsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if _should_skip_rls(request.url.path):
            return await call_next(request)
        if request.method == "OPTIONS":
            return await call_next(request)

        auth = request.headers.get("authorization")
        if not auth or not auth.lower().startswith("bearer "):
            return await call_next(request)

        token = auth[7:].strip()
        settings = get_settings()
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
            )
        except JWTError:
            return await call_next(request)

        wid = payload.get("wid")
        if not wid:
            return await call_next(request)

        async with workspace_transaction(str(wid)):
            return await call_next(request)

"""AgentOps Dashboard — FastAPI entrypoint (local + Databricks Apps)."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.agents_router import router as agents_router
from app.api.v1.auth_router import router as auth_router
from app.api.v1.connections_router import router as connections_router
from app.api.v1.router import router as v1_router
from app.config import Settings
from app.deps import _apply_connection_context
from app.runtime_context import reset_runtime_context
from app.services import tenant_store
from app.services.databricks_status import sql_probe
from app.services.tokens import decode_access_token

_settings = Settings()

app = FastAPI(
    title="AgentOps Dashboard API",
    description="Accelerator backend: health, cost, quality, governance aggregates.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def tenant_connection_middleware(request: Request, call_next):
    """When a Bearer token is present, use that user's active Databricks connection instead of .env."""
    tokens = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        jwt_token = auth[7:].strip()
        payload = decode_access_token(jwt_token)
        if payload and payload.get("sub"):
            user = tenant_store.get_user_by_id(str(payload["sub"]))
            if user:
                tokens = _apply_connection_context(user)
    try:
        return await call_next(request)
    finally:
        if tokens:
            reset_runtime_context(tokens)


@app.get("/api/health")
def health() -> dict[str, object]:
    db = sql_probe()
    return {
        "status": "ok",
        "service": "agentops-api",
        "databricks": db,
        "auth_enabled": True,
    }


app.include_router(auth_router, prefix="/api/v1")
app.include_router(connections_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(v1_router, prefix="/api/v1")

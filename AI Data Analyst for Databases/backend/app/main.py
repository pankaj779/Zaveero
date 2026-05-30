import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import prisma
from app.middleware_rls import RlsMiddleware
from app.routers import (
    ai_sql,
    audit,
    auth,
    crawler,
    dashboards,
    db_connections,
    execute,
    history,
    internal_jobs,
    lineage,
    metadata,
    saved_reports,
    sql_tools,
    usage,
    workspace_admin,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await prisma.connect()
    yield
    await prisma.disconnect()


logger = logging.getLogger(__name__)

app = FastAPI(title="DataWhisper API", version="2.0.0", lifespan=lifespan)
settings = get_settings()


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    """Ensure JSON + CORS headers on unexpected errors. Never leak internals to clients."""
    traceback.print_exc()
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    origin = request.headers.get("origin")
    headers: dict[str, str] = {}
    if origin and origin in settings.cors_origin_list:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again or contact support."},
        headers=headers,
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RlsMiddleware)

app.include_router(auth.router)
app.include_router(workspace_admin.router)
app.include_router(db_connections.router)
app.include_router(metadata.router)
app.include_router(lineage.router)
app.include_router(ai_sql.router)
app.include_router(execute.router)
app.include_router(history.router)
app.include_router(usage.router)
app.include_router(saved_reports.router)
app.include_router(dashboards.router)
app.include_router(audit.router)
app.include_router(sql_tools.router)
app.include_router(crawler.router)
app.include_router(internal_jobs.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

"""Zaavero Platform API — unified SaaS shell for enterprise products."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import prisma
from app.routers import auth, billing, dashboard, marketplace, products, workspace


@asynccontextmanager
async def lifespan(app: FastAPI):
    await prisma.connect()
    yield
    await prisma.disconnect()


settings = get_settings()

app = FastAPI(
    title="Zaavero Platform API",
    description="Unified platform API for AgentOps, DataWhisper, and future products.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(marketplace.router)
app.include_router(dashboard.router)
app.include_router(billing.router)
app.include_router(workspace.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "zaavero-platform-api",
        "version": "1.0.0",
        "platform": settings.platform_name,
    }

"""
Job queue.

Two execution modes, chosen automatically based on the `REDIS_URL` env var:

  1. **arq + Redis** (production): when `REDIS_URL` is set, jobs are pushed onto
     a Redis-backed queue and processed by a separate `worker` container running
     `python -m app.worker`. Crawls survive API restarts and can be parallelised.

  2. **In-process BackgroundTasks** (dev fallback): when `REDIS_URL` is empty,
     we use FastAPI's `BackgroundTasks` — the same behaviour as before. This
     keeps `docker compose up` working without extra services.

API code does **not** care which mode is active — it always calls
`enqueue_crawl(...)` and we route appropriately.

Job functions live here too. Each job opens its own Prisma client (workers
have no FastAPI lifespan), and wraps writes in `workspace_transaction`.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)

# Job names — keep stable across worker deploys.
JOB_RUN_CRAWL = "run_crawl"


def redis_url() -> str | None:
    v = os.getenv("REDIS_URL", "").strip()
    return v or None


async def enqueue_crawl(
    source_id: str,
    workspace_id: str,
    config: dict[str, Any],
    *,
    background_tasks: BackgroundTasks | None = None,
) -> str:
    """Enqueue a crawl. Returns a job id (or 'inline' for the in-process fallback)."""
    if redis_url():
        # Lazy import so dev installs without arq still work.
        from arq import create_pool  # type: ignore
        from arq.connections import RedisSettings  # type: ignore

        settings = RedisSettings.from_dsn(redis_url())
        pool = await create_pool(settings)
        try:
            job = await pool.enqueue_job(
                JOB_RUN_CRAWL,
                source_id=source_id,
                workspace_id=workspace_id,
                config=config,
            )
            return job.job_id if job else "queued"
        finally:
            await pool.close()
    else:
        # In-process fallback — caller passes BackgroundTasks (from the FastAPI route).
        from app.services.crawl_runner import run_crawl  # local import to avoid cycles
        if background_tasks is None:
            raise RuntimeError(
                "enqueue_crawl was called without REDIS_URL and without background_tasks; "
                "either configure REDIS_URL or pass background_tasks=request.background_tasks."
            )
        background_tasks.add_task(run_crawl, source_id, workspace_id, config)
        return "inline"


# ---------------------------------------------------------------------------
# arq worker entrypoint helpers
# ---------------------------------------------------------------------------

async def _job_run_crawl(ctx: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
    """arq job that ultimately calls `crawl_runner.run_crawl`."""
    from app.services.crawl_runner import run_crawl

    source_id = kwargs["source_id"]
    workspace_id = kwargs["workspace_id"]
    config = kwargs["config"]
    logger.info("worker.run_crawl start source=%s", source_id)
    await run_crawl(source_id, workspace_id, config)
    logger.info("worker.run_crawl done source=%s", source_id)
    return {"source_id": source_id, "ok": True}


async def worker_startup(ctx: dict[str, Any]) -> None:
    """Open the Prisma client for the worker process."""
    from app.db import prisma
    if not prisma.is_connected():
        await prisma.connect()
    logger.info("arq worker: Prisma connected")


async def worker_shutdown(ctx: dict[str, Any]) -> None:
    from app.db import prisma
    if prisma.is_connected():
        await prisma.disconnect()
    logger.info("arq worker: Prisma disconnected")


def get_worker_settings():
    """Build the arq WorkerSettings class. Imported lazily so dev installs without arq still work."""
    from arq.connections import RedisSettings  # type: ignore

    dsn = redis_url()
    if not dsn:
        raise RuntimeError("REDIS_URL must be set to run the arq worker")

    class WorkerSettings:
        functions = [_job_run_crawl_alias()]
        on_startup = worker_startup
        on_shutdown = worker_shutdown
        redis_settings = RedisSettings.from_dsn(dsn)
        # Reasonable defaults; can tune via env if needed.
        max_jobs = int(os.getenv("ARQ_MAX_JOBS", "4"))
        job_timeout = int(os.getenv("ARQ_JOB_TIMEOUT", "3600"))

    return WorkerSettings


def _job_run_crawl_alias():
    """arq picks job name from the function's `__name__`. Rename our function to JOB_RUN_CRAWL."""
    fn = _job_run_crawl
    fn.__name__ = JOB_RUN_CRAWL
    return fn

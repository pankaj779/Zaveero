"""Prisma client. `prisma` is a proxy: under RLS middleware it resolves to the request transaction client."""

from __future__ import annotations

from contextlib import asynccontextmanager
from contextvars import ContextVar
from datetime import timedelta
from typing import AsyncIterator

from prisma import Prisma

_prisma_singleton = Prisma()
_prisma_tx_ctx: ContextVar[Prisma | None] = ContextVar("prisma_tx", default=None)


def get_prisma() -> Prisma:
    """Active Prisma client: request-scoped transaction when RLS middleware is active, else singleton."""
    p = _prisma_tx_ctx.get()
    return p if p is not None else _prisma_singleton


class PrismaProxy:
    __slots__ = ()

    def __getattr__(self, name: str):
        return getattr(get_prisma(), name)


prisma = PrismaProxy()


@asynccontextmanager
async def workspace_transaction(workspace_id: str) -> AsyncIterator[Prisma]:
    """Open a DB transaction, set transaction-local `app.workspace_id` for RLS, yield the tx client."""
    async with _prisma_singleton.tx(timeout=timedelta(seconds=120)) as tx:
        await tx.execute_raw(
            "SELECT set_config('app.workspace_id', $1::text, true)",
            workspace_id,
        )
        token = _prisma_tx_ctx.set(tx)
        try:
            yield tx
        finally:
            _prisma_tx_ctx.reset(token)

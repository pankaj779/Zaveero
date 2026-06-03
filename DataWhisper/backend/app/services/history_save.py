"""Persist chat / query turns to query_history (best-effort)."""

from __future__ import annotations

import logging
from typing import Any

from app.db import prisma

logger = logging.getLogger(__name__)

CHAT_SQL_PREFIX = "-- chat:"


async def save_chat_history(
    *,
    workspace_id: str,
    user_id: str,
    connection_id: str,
    metadata_version_id: str | None,
    question: str,
    answer: str,
    confidence: float,
    intent: str,
) -> None:
    try:
        await prisma.queryhistory.create(
            data={
                "workspaceId": workspace_id,
                "userId": user_id,
                "connectionId": connection_id,
                "metadataVersionId": metadata_version_id,
                "question": question[:4000],
                "sqlText": f"{CHAT_SQL_PREFIX}{intent}",
                "resultRowCount": 0,
                "chartType": "answer",
                "explanation": (answer or "")[:8000] or None,
                "confidenceScore": confidence,
            }
        )
    except Exception:
        logger.debug("chat history save skipped", exc_info=True)


def is_chat_history_sql(sql_text: str | None) -> bool:
    return bool(sql_text and sql_text.strip().startswith(CHAT_SQL_PREFIX))

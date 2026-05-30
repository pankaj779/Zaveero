"""Per-workspace rate limiter for AI generation and query execution."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException

# Sliding window counters: workspace_id -> list of timestamps
_ai_calls: dict[str, list[float]] = defaultdict(list)
_exec_calls: dict[str, list[float]] = defaultdict(list)

AI_LIMIT_PER_MINUTE = 20
EXEC_LIMIT_PER_MINUTE = 60
WINDOW_SECONDS = 60


def _prune(timestamps: list[float], now: float) -> list[float]:
    cutoff = now - WINDOW_SECONDS
    return [t for t in timestamps if t > cutoff]


def check_ai_rate(workspace_id: str) -> None:
    now = time.time()
    _ai_calls[workspace_id] = _prune(_ai_calls[workspace_id], now)
    if len(_ai_calls[workspace_id]) >= AI_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"AI generation rate limit exceeded ({AI_LIMIT_PER_MINUTE}/min). Please wait a moment.",
        )
    _ai_calls[workspace_id].append(now)


def check_exec_rate(workspace_id: str) -> None:
    now = time.time()
    _exec_calls[workspace_id] = _prune(_exec_calls[workspace_id], now)
    if len(_exec_calls[workspace_id]) >= EXEC_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Query execution rate limit exceeded ({EXEC_LIMIT_PER_MINUTE}/min). Please wait a moment.",
        )
    _exec_calls[workspace_id].append(now)

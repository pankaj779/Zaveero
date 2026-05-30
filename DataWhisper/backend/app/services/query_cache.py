"""Simple in-memory query result cache with TTL."""

from __future__ import annotations

import hashlib
import time
from typing import Any

_cache: dict[str, dict[str, Any]] = {}

DEFAULT_TTL_SECONDS = 300  # 5 minutes


def _cache_key(connection_id: str, sql: str) -> str:
    raw = f"{connection_id}:{sql.strip().rstrip(';')}"
    return hashlib.sha256(raw.encode()).hexdigest()


def get_cached(connection_id: str, sql: str) -> dict[str, Any] | None:
    key = _cache_key(connection_id, sql)
    entry = _cache.get(key)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        _cache.pop(key, None)
        return None
    return entry["data"]


def set_cached(
    connection_id: str,
    sql: str,
    data: dict[str, Any],
    ttl: int = DEFAULT_TTL_SECONDS,
) -> None:
    key = _cache_key(connection_id, sql)
    _cache[key] = {"data": data, "expires_at": time.time() + ttl}
    # Evict old entries if cache grows too large
    if len(_cache) > 500:
        now = time.time()
        expired = [k for k, v in _cache.items() if now > v["expires_at"]]
        for k in expired:
            _cache.pop(k, None)


def invalidate_connection(connection_id: str) -> None:
    """Clear all cached results for a connection (e.g., after metadata re-scan)."""
    prefix = hashlib.sha256(f"{connection_id}:".encode()).hexdigest()[:8]
    # Can't prefix-match SHA256, so we just clear all — simple and safe
    _cache.clear()

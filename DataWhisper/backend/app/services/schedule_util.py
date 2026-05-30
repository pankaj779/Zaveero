from __future__ import annotations

from datetime import datetime, timezone

from croniter import croniter


def next_cron_fire(cron_expr: str, base: datetime | None = None) -> datetime:
    """Next UTC fire time after `base` (default: now)."""
    if base is None:
        base = datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    itr = croniter(cron_expr, base)
    nxt = itr.get_next(datetime)
    if isinstance(nxt, datetime) and nxt.tzinfo is None:
        nxt = nxt.replace(tzinfo=timezone.utc)
    return nxt

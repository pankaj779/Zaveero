"""Coerce query result values to JSON-serializable Python types."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID


def json_safe_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, memoryview):
        return bytes(value).decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {str(k): json_safe_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [json_safe_value(v) for v in value]
    if hasattr(value, "_asdict"):
        try:
            return json_safe_value(value._asdict())
        except Exception:
            pass
    if hasattr(value, "asDict"):
        try:
            return json_safe_value(value.asDict())
        except Exception:
            pass
    return str(value)


def json_safe_row(row: dict[str, Any]) -> dict[str, Any]:
    return {str(k): json_safe_value(v) for k, v in row.items()}

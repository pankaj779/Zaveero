"""JSON helpers for persisting metadata scans to Postgres."""

from __future__ import annotations

import json
import math
from datetime import date, datetime
from decimal import Decimal
from typing import Any


def _json_default(o: Any) -> Any:
    if isinstance(o, bytes):
        return o.hex()
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, tuple):
        return list(o)
    return str(o)


def scrub_non_finite(obj: Any) -> Any:
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {str(k): scrub_non_finite(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [scrub_non_finite(x) for x in obj]
    return obj


def prisma_json_safe(value: Any) -> Any:
    scrubbed = scrub_non_finite(value)
    return json.loads(json.dumps(scrubbed, default=_json_default, ensure_ascii=True))


def jsonb_param(value: Any) -> str:
    clean = prisma_json_safe(value)
    return json.dumps(clean, ensure_ascii=True, default=_json_default)


def metadata_for_persist(meta: dict[str, Any]) -> dict[str, Any]:
    tables_out: list[dict[str, Any]] = []
    for t in meta.get("tables") or []:
        if not isinstance(t, dict):
            continue
        slim = dict(t)
        samples = t.get("sample_rows") or []
        slim["sample_rows"] = samples[:3]
        tables_out.append(slim)
    return {**meta, "tables": tables_out}

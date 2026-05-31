from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.services.sql_row_limit import apply_execution_limit
from app.utils.db_clients import execute_readonly


def _is_numeric(v: Any) -> bool:
    return isinstance(v, bool) is False and isinstance(v, (int, float, Decimal))


def _is_temporal(v: Any) -> bool:
    return isinstance(v, (datetime, date))


def infer_chart_type(columns: list[str], rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "empty"
    if len(rows) == 1 and len(columns) <= 3:
        return "kpi"
    if len(columns) < 2:
        return "table"
    col0_vals = [r.get(columns[0]) for r in rows]
    col1_vals = [r.get(columns[1]) for r in rows]
    t0 = sum(1 for v in col0_vals if _is_temporal(v))
    t1 = sum(1 for v in col1_vals if _is_temporal(v))
    n0 = sum(1 for v in col0_vals if _is_numeric(v))
    n1 = sum(1 for v in col1_vals if _is_numeric(v))
    if (t0 > len(rows) // 2 and n1 > len(rows) // 2) or (t1 > len(rows) // 2 and n0 > len(rows) // 2):
        return "line"
    if len(rows) <= 8 and len(columns) == 2:
        cat_first = all(isinstance(v, str) for v in col0_vals[: min(12, len(col0_vals))])
        num_second = n1 > len(rows) // 2
        if cat_first and num_second:
            return "doughnut"
    if (n0 > len(rows) // 2 and not t0) or (n1 > len(rows) // 2 and not t1):
        other_idx = 1 if n0 > n1 else 0
        if all(isinstance(r.get(columns[other_idx]), str) for r in rows[: min(10, len(rows))]):
            return "bar"
    if len(rows) <= 12 and len(columns) == 2:
        return "bar"
    if len(columns) >= 3:
        # Heuristic: category + category + metric → pivot-friendly
        n2 = sum(1 for v in [r.get(columns[2]) for r in rows] if _is_numeric(v))
        if n2 > len(rows) // 2:
            return "pivot"
    return "table"


def resolve_chart_type(
    columns: list[str],
    rows: list[dict[str, Any]],
    preference: str | None,
) -> str:
    """preference: auto | bar | line | doughnut | pivot | table | kpi"""
    p = (preference or "auto").lower().strip()
    allowed = {"auto", "bar", "line", "doughnut", "pivot", "table", "kpi", "empty"}
    if p not in allowed:
        p = "auto"
    if p == "auto":
        return infer_chart_type(columns, rows)
    if p == "kpi" and len(rows) == 1:
        return "kpi"
    if p == "kpi" and len(rows) != 1:
        return infer_chart_type(columns, rows)
    if p == "empty" and not rows:
        return "empty"
    if p in ("bar", "line", "doughnut", "pivot", "table") and not rows:
        return "empty"
    return p


def _json_safe_row(row: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in row.items():
        if isinstance(v, (datetime, date)):
            out[k] = v.isoformat()
        elif isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, bytes):
            out[k] = v.decode("utf-8", errors="replace")
        else:
            out[k] = v
    return out


async def run_query(
    conn_type: str,
    config: dict[str, Any],
    sql: str,
    max_rows: int = 500,
    chart_preference: str | None = None,
) -> dict[str, Any]:
    ct = conn_type.upper()
    safe_sql = apply_execution_limit(sql, max_rows, dialect=ct)
    columns, rows = await execute_readonly(conn_type, config, safe_sql, max_rows=max_rows)
    safe_rows = [_json_safe_row(r) for r in rows]
    chart = resolve_chart_type(columns, safe_rows, chart_preference)
    return {
        "columns": columns,
        "rows": safe_rows,
        "chart_type": chart,
        "row_count": len(safe_rows),
    }

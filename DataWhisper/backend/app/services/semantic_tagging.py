import re
from typing import Any


_METRIC_NAMES = re.compile(
    r"\b(value|amount|price|cost|total|revenue|count|quantity|qty|score|rate|sum|avg|"
    r"balance|profit|margin|budget|salary|wage|fee|tax|discount|weight|height|"
    r"length|width|size|volume|area|distance|speed|duration|percentage|ratio|rank)\b",
    re.IGNORECASE,
)


def infer_column_semantic(name: str, data_type: str) -> str:
    """Return one of: date, metric, id, text"""
    n = name.lower()
    t = (data_type or "").lower()

    if any(x in t for x in ("date", "time", "timestamp")):
        return "date"
    if re.search(r"\b(id|key|uuid|guid)\b", n) or n.endswith("_id") or n == "id":
        return "id"
    if any(x in t for x in ("int", "numeric", "decimal", "float", "double", "real", "number", "bigint", "smallint")):
        return "metric"
    # Column name strongly suggests numeric even if type is STRING
    if _METRIC_NAMES.search(n):
        return "metric"
    if any(x in t for x in ("char", "text", "string", "varchar", "variant", "json")):
        return "text"
    return "text"


def tag_table_columns(table: dict[str, Any]) -> dict[str, Any]:
    """Attach semantic field to each column dict."""
    out = {**table}
    cols = []
    for c in table.get("columns", []):
        name = c.get("name", "")
        typ = str(c.get("type", ""))
        semantic = infer_column_semantic(name, typ)
        cols.append({**c, "semantic": semantic})
    out["columns"] = cols
    return out


def apply_semantic_to_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    tables = [tag_table_columns(t) for t in metadata.get("tables", [])]
    return {**metadata, "tables": tables}

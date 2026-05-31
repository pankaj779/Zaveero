"""Answer 'list tables / schema catalog' questions from scanned metadata (no DB round-trip)."""

from __future__ import annotations

import re
from typing import Any

_CATALOG_QUESTION = re.compile(
    r"\b("
    r"list\s+(?:all\s+)?tables?"
    r"|show\s+tables?"
    r"|what\s+tables?"
    r"|which\s+tables?"
    r"|tables?\s+in\s+(?:the\s+)?(?:schema|database|catalog|db)"
    r"|tables?\s+(?:available|exist|present)"
    r"|name\s+(?:all\s+)?tables?"
    r")\b",
    re.IGNORECASE,
)

_SHOW_TABLES_SQL = re.compile(
    r"^\s*SHOW\s+TABLES\b",
    re.IGNORECASE,
)

_SCHEMA_IN_QUESTION = re.compile(
    r"\b(?:in|from|for)\s+(?:the\s+)?(?:schema|catalog|database|db)\s+[`\"']?([\w.-]+(?:\.[\w.-]+)*)[`\"']?",
    re.IGNORECASE,
)

_SCHEMA_IN_SHOW = re.compile(
    r"^\s*SHOW\s+TABLES\s+(?:FROM|IN)\s+(`?[\w.]+`?)",
    re.IGNORECASE,
)


def _clean_ident(raw: str) -> str:
    s = raw.strip().strip("`\"'")
    return s


def is_catalog_list_intent(question: str | None, sql: str | None = None) -> bool:
    if sql and _SHOW_TABLES_SQL.match(sql.strip()):
        return True
    if not question:
        return False
    return bool(_CATALOG_QUESTION.search(question))


_GENERIC_SCOPE_WORDS = frozenset({"schema", "database", "catalog", "db", "the"})


def _schema_scope_from_text(text: str) -> str | None:
    m = _SCHEMA_IN_QUESTION.search(text)
    if m:
        scope = _clean_ident(m.group(1))
        if scope.lower() not in _GENERIC_SCOPE_WORDS:
            return scope
    # "tables in agent_logs" / "in agentops.agent_logs"
    m2 = re.search(
        r"\btables?\s+in\s+(?:the\s+)?[`\"']?([\w.-]+(?:\.[\w.-]+)*)[`\"']?",
        text,
        re.IGNORECASE,
    )
    if m2:
        scope = _clean_ident(m2.group(1))
        if scope.lower() not in _GENERIC_SCOPE_WORDS:
            return scope
    return None


def extract_schema_scope(question: str | None, sql: str | None, meta: dict[str, Any]) -> str | None:
    if sql:
        m = _SCHEMA_IN_SHOW.match(sql.strip())
        if m:
            return _clean_ident(m.group(1))
    if question:
        scope = _schema_scope_from_text(question)
        if scope:
            return scope
    # Default: if all tables share one catalog.schema prefix, use that when question is generic
    names = [t.get("name", "") for t in meta.get("tables", []) if isinstance(t, dict)]
    if len(names) == 1:
        parts = names[0].rsplit(".", 1)
        if len(parts) == 2:
            return parts[0]
    return None


def _table_matches_scope(full_name: str, scope: str | None) -> bool:
    if not scope:
        return True
    scope_l = scope.lower()
    name_l = full_name.lower()
    if name_l == scope_l:
        return True
    if name_l.startswith(scope_l + "."):
        return True
    # scope may be schema only while names are catalog.schema.table
    parts = full_name.split(".")
    if len(parts) >= 2 and parts[-2].lower() == scope_l.split(".")[-1]:
        if "." not in scope_l:
            return True
    if len(parts) >= 3:
        prefix = ".".join(parts[:-1]).lower()
        if prefix == scope_l or prefix.endswith("." + scope_l):
            return True
    return False


def list_tables_from_metadata(
    meta: dict[str, Any],
    question: str | None = None,
    sql: str | None = None,
    max_rows: int = 500,
) -> dict[str, Any] | None:
    """
    Build a tabular result from scanned metadata for catalog/list-tables questions.
    Returns None if this is not a catalog question.
    """
    if not is_catalog_list_intent(question, sql):
        return None

    scope = extract_schema_scope(question, sql, meta)
    tables = [t for t in meta.get("tables", []) if isinstance(t, dict) and t.get("name")]
    filtered = [t for t in tables if _table_matches_scope(str(t["name"]), scope)]

    rows: list[dict[str, Any]] = []
    for t in filtered[:max_rows]:
        full = str(t["name"])
        parts = full.split(".")
        short = parts[-1] if parts else full
        schema_part = ".".join(parts[:-1]) if len(parts) > 1 else ""
        rows.append(
            {
                "table_name": short,
                "full_name": full,
                "schema": schema_part,
                "row_count": t.get("row_count"),
            }
        )

    display_sql = sql or (f"-- Tables from scanned metadata{f' ({scope})' if scope else ''}")
    return {
        "columns": ["table_name", "full_name", "schema", "row_count"],
        "rows": rows,
        "chart_type": "table",
        "row_count": len(rows),
        "sql": display_sql,
        "explanation": (
            f"Listed {len(rows)} table(s) from your connection metadata"
            + (f" in scope '{scope}'." if scope else ".")
            + " No live SHOW query was needed."
        ),
    }

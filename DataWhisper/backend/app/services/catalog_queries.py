"""Answer 'list tables / schema catalog' questions from scanned metadata (no DB round-trip)."""

from __future__ import annotations

import re
from typing import Any

_CATALOG_QUESTION = re.compile(
    r"\b("
    r"list\s+(?:all\s+)?tables?"
    r"|show\s+(?:all\s+)?tables?"
    r"|what\s+tables?"
    r"|which\s+tables?"
    r"|tables?\s+in\s+(?:the\s+)?(?:schema|database|catalog|db)\b"
    r"|tables?\s+(?:available|exist|present|are\s+there)"
    r"|name\s+(?:all\s+)?tables?"
    r")\b",
    re.IGNORECASE,
)

_SHOW_TABLES_SQL = re.compile(
    r"^\s*SHOW\s+TABLES\b",
    re.IGNORECASE,
)

# "tables in the catalog" / "tables in the schema" — generic, not a real schema name
_GENERIC_LIST_ENDING = re.compile(
    r"\btables?\s+in\s+(?:the\s+)?(?:catalog|schema|database|db)[?.!,]?\s*$",
    re.IGNORECASE,
)

_GENERIC_SCOPE_WORDS = frozenset({
    "schema", "database", "catalog", "db", "the", "a", "an", "my", "our", "your",
})

_SCHEMA_IN_SHOW = re.compile(
    r"^\s*SHOW\s+TABLES\s+(?:FROM|IN)\s+(`?[\w.]+`?)",
    re.IGNORECASE,
)


def _clean_ident(raw: str) -> str:
    s = raw.strip().strip("`\"'")
    return s.rstrip("?.!,")


def is_catalog_list_intent(question: str | None, sql: str | None = None) -> bool:
    if sql and _SHOW_TABLES_SQL.match(sql.strip()):
        return True
    if not question:
        return False
    return bool(_CATALOG_QUESTION.search(question))


def _schema_scope_from_text(text: str) -> str | None:
    if _GENERIC_LIST_ENDING.search(text.strip()):
        return None
    # Named schema/catalog: "tables in agent_logs" or "in agentops.agent_logs"
    m = re.search(
        r"\btables?\s+in\s+(?:the\s+)?[`\"']?([\w.-]+(?:\.[\w.-]+)+)[`\"']?(?:\s|$|[?.!,])",
        text,
        re.IGNORECASE,
    )
    if m:
        scope = _clean_ident(m.group(1))
        if scope.lower() not in _GENERIC_SCOPE_WORDS:
            return scope
    # Single-segment name that is not a generic word
    m2 = re.search(
        r"\btables?\s+in\s+(?:the\s+)?[`\"']?([a-zA-Z_][\w.-]*)[`\"']?(?:\s|$|[?.!,])",
        text,
        re.IGNORECASE,
    )
    if m2:
        scope = _clean_ident(m2.group(1))
        if scope.lower() not in _GENERIC_SCOPE_WORDS and len(scope) > 1:
            return scope
    return None


def extract_schema_scope(question: str | None, sql: str | None, meta: dict[str, Any]) -> str | None:
    if sql:
        m = _SCHEMA_IN_SHOW.match(sql.strip())
        if m:
            scope = _clean_ident(m.group(1))
            if scope.lower() not in _GENERIC_SCOPE_WORDS:
                return scope
    if question:
        scope = _schema_scope_from_text(question)
        if scope:
            return scope
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
    """Build tabular catalog answer from scanned metadata. Returns None if not a catalog question."""
    if not is_catalog_list_intent(question, sql):
        return None

    scope = extract_schema_scope(question, sql, meta)
    tables = [t for t in meta.get("tables", []) if isinstance(t, dict) and t.get("name")]
    filtered = [t for t in tables if _table_matches_scope(str(t["name"]), scope)]

    # Safety: generic "list tables" must never return empty when metadata has tables
    if not filtered and tables and is_catalog_list_intent(question):
        filtered = tables

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

    scope_note = f" (scope: {scope})" if scope else ""
    display_sql = sql or f"-- Tables from scanned metadata{scope_note}"
    return {
        "columns": ["table_name", "full_name", "schema", "row_count"],
        "rows": rows,
        "chart_type": "table",
        "row_count": len(rows),
        "sql": display_sql,
        "explanation": (
            f"Listed {len(rows)} table(s) from your scanned connection metadata{scope_note}. "
            "Foreign keys are not required — any scanned table can be queried in Chat."
        ),
    }


def catalog_list_sql_for_ai(meta: dict[str, Any], question: str) -> str | None:
    """Return display SQL for AI short-circuit on catalog questions."""
    result = list_tables_from_metadata(meta, question=question)
    if not result or not result["rows"]:
        return None
    lines = ["SELECT table_name, full_name, schema, row_count FROM (VALUES"]
    vals = []
    for r in result["rows"]:
        rc = r.get("row_count")
        rc_sql = "NULL" if rc is None else str(int(rc) if isinstance(rc, (int, float)) else rc)
        vals.append(
            f"  ('{r['table_name']}', '{r['full_name']}', '{r['schema']}', {rc_sql})"
        )
    lines.append(",\n".join(vals))
    lines.append(") AS t(table_name, full_name, schema, row_count)")
    return "\n".join(lines)

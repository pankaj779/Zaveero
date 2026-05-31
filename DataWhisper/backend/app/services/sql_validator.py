"""SQL validation: schema alignment, lineage joins, read-only safety. Returns structured errors."""

from __future__ import annotations

import re
from typing import Any

import sqlparse
from sqlparse.sql import Identifier, IdentifierList
from sqlparse.tokens import Keyword

FORBIDDEN = re.compile(
    r"\b(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT|MERGE|GRANT|REVOKE|EXEC|EXECUTE|"
    r"CALL|COPY|CREATE|REPLACE|ATTACH|DETACH|VACUUM|ANALYZE|COMMENT|LOCK|SET\s+ROLE)\b",
    re.IGNORECASE,
)


def _cte_alias_names(sql: str) -> set[str]:
    """Best-effort CTE name extraction so CTE aliases are not flagged as unknown tables."""
    s = sql.strip().rstrip(";")
    if not re.match(r"^\s*WITH\b", s, re.I):
        return set()
    end = re.search(r"\)\s+SELECT\b", s, re.I)
    if not end:
        return set()
    header = s[: end.start() + 1]
    return set(
        re.findall(
            r"(?:\bWITH\s+(?:RECURSIVE\s+)?|\b,\s*)([a-zA-Z_][\w]*)\s+AS\s*\(",
            header,
            re.I,
        )
    )


def _subquery_aliases(sql: str) -> set[str]:
    """Extract aliases of subqueries: FROM (...) alias  /  JOIN (...) alias."""
    aliases: set[str] = set()
    for m in re.finditer(r"\)\s+(?:AS\s+)?([A-Za-z_]\w*)", sql, re.IGNORECASE):
        aliases.add(m.group(1).lower())
    return aliases


def _is_virtual_name(raw: str, cte_lower: set[str], subq_lower: set[str]) -> bool:
    short = raw.split(".")[-1].lower()
    return short in cte_lower or short in subq_lower


def _err(code: str, message: str, detail: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {"code": code, "message": message}
    if detail:
        out["detail"] = detail
    return out


def _full_ident_name(ident: Identifier) -> str | None:
    """Return the full dotted name (catalog.schema.table), cleaned of quoting."""
    parts: list[str] = []
    for tok in ident.flatten():
        if tok.ttype in (sqlparse.tokens.Name, sqlparse.tokens.Literal.String.Single):
            parts.append(tok.value)
        elif tok.ttype is sqlparse.tokens.Punctuation and tok.value == ".":
            parts.append(".")
        else:
            break
    raw = "".join(parts)
    if not raw:
        raw = ident.get_real_name() or ""
    return _clean_ident(raw) if raw else None


def _tables_from_statement(sql: str) -> set[str]:
    parsed = sqlparse.parse(sql)
    if not parsed:
        return set()
    stmt = parsed[0]
    tables: set[str] = set()
    from_seen = False
    for token in stmt.tokens:
        if token.is_whitespace:
            continue
        if token.ttype is Keyword and token.value.upper() == "FROM":
            from_seen = True
            continue
        if token.ttype is Keyword and "JOIN" in token.value.upper():
            from_seen = True
            continue
        if from_seen:
            if hasattr(token, "ttype") and token.ttype is not None:
                pass
            elif isinstance(token, sqlparse.sql.Parenthesis):
                from_seen = False
                continue
            elif isinstance(token, IdentifierList):
                for ident in token.get_identifiers():
                    if any(isinstance(t, sqlparse.sql.Parenthesis) for t in ident.tokens):
                        continue
                    name = _full_ident_name(ident)
                    if name:
                        tables.add(name)
                from_seen = False
            elif isinstance(token, Identifier):
                if any(isinstance(t, sqlparse.sql.Parenthesis) for t in token.tokens):
                    from_seen = False
                    continue
                name = _full_ident_name(token)
                if name:
                    tables.add(name)
                from_seen = False
    return tables


def _rough_tables(sql: str) -> set[str]:
    ident_re = r"""(?:(?:\[[\w\s]+\]|`[^`]+`|"[^"]+"|[\w]+)(?:\.(?:\[[\w\s]+\]|`[^`]+`|"[^"]+"|[\w]+))*)"""
    tables: set[str] = set()
    for m in re.finditer(rf"FROM\s+({ident_re})", sql, re.IGNORECASE):
        if m.group(1).startswith("("):
            continue
        tables.add(_clean_ident(m.group(1)))
    for m in re.finditer(rf"JOIN\s+({ident_re})", sql, re.IGNORECASE):
        if m.group(1).startswith("("):
            continue
        tables.add(_clean_ident(m.group(1)))
    return {t for t in tables if t}


def _clean_ident(s: str) -> str:
    """Strip backticks, double-quotes, and square brackets from identifiers."""
    s = s.strip()
    # Split on dots that separate quoted segments: [a].[b] or `a`.`b` or "a"."b" or a.b
    parts = re.split(r'(?<=\])\s*\.\s*(?=\[)|(?<=`)\s*\.\s*(?=`)|(?<=")\s*\.\s*(?=")|\.', s)
    cleaned = []
    for p in parts:
        p = p.strip()
        if p.startswith("[") and p.endswith("]"):
            p = p[1:-1]
        elif p.startswith("`") and p.endswith("`"):
            p = p[1:-1]
        elif p.startswith('"') and p.endswith('"'):
            p = p[1:-1]
        p = p.strip()
        if p:
            cleaned.append(p)
    return ".".join(cleaned) if cleaned else ""


def _normalize_table(name: str, known: set[str]) -> str | None:
    if name in known:
        return name
    name_lower = name.lower()
    # exact case-insensitive
    for k in known:
        if k.lower() == name_lower:
            return k
    # suffix match: known="catalog.schema.table", name="schema.table" or "table"
    for k in known:
        if k.lower().endswith("." + name_lower):
            return k
    # last-segment match: known="catalog.schema.table", name="table"
    for k in known:
        if k.split(".")[-1].lower() == name_lower.split(".")[-1].lower():
            return k
    return None


def _columns_for_table(meta_tables: dict[str, dict], table: str) -> set[str]:
    t = meta_tables.get(table, {})
    return {c["name"].lower() for c in t.get("columns", [])}


def _pair_allowed(from_t: str, to_t: str, edges: list[dict[str, str]]) -> bool:
    for e in edges:
        if (e["from_table"] == from_t and e["to_table"] == to_t) or (
            e["from_table"] == to_t and e["to_table"] == from_t
        ):
            return True
    return False


def _extract_aliases(sql: str) -> dict[str, str]:
    alias_map: dict[str, str] = {}
    # Match table references including [brackets], `backticks`, "quotes", and dotted names
    tbl_pat = r"""(?:[`"\[\w][`"\[\]\w.]*[`"\]\w]|[\w.]+)"""
    pattern = re.compile(
        rf"\bFROM\s+({tbl_pat})\s+(?:AS\s+)?(\w+)\b|\bJOIN\s+({tbl_pat})\s+(?:AS\s+)?(\w+)\b",
        re.IGNORECASE,
    )
    for m in pattern.finditer(sql):
        if m.group(2):
            tbl = _clean_ident(m.group(1))
            alias_map[m.group(2).lower()] = tbl
        if m.group(4):
            tbl = _clean_ident(m.group(3))
            alias_map[m.group(4).lower()] = tbl
    return alias_map


def _split_qual(
    qual: str,
    alias_map: dict[str, str],
    known_tables: set[str],
) -> tuple[str | None, str]:
    parts = qual.split(".")
    if len(parts) >= 2:
        col = parts[-1]
        table_part = ".".join(parts[:-1])
        full = alias_map.get(table_part.lower())
        if full:
            full = _normalize_table(full, known_tables) or full
        else:
            full = _normalize_table(table_part, known_tables)
        return full, col
    if len(parts) == 1:
        return None, parts[0]
    return None, qual


def _validate_columns(
    sql: str,
    resolved_tables: dict[str, str],
    tables_meta: dict[str, dict],
    alias_map: dict[str, str],
    known_tables: set[str],
) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    dotted = re.findall(r"\b([\w]+)\.([\w]+)\b", sql)
    for alias_or_table, col in dotted:
        key = alias_or_table.lower()
        if key in alias_map:
            full = _normalize_table(alias_map[key], known_tables)
        else:
            full = _normalize_table(alias_or_table, known_tables)
        if not full:
            continue
        cols = _columns_for_table(tables_meta, full)
        if col.lower() not in cols and col != "*":
            errors.append(
                _err(
                    "UNKNOWN_COLUMN",
                    f"Column '{col}' is not defined on table '{full}' in metadata.",
                    f"table={full}, column={col}",
                )
            )
    return errors


def _validate_joins(
    sql: str,
    lineage_edges: list[dict[str, str]],
    resolved_tables: dict[str, str],
    alias_map: dict[str, str],
    known_tables: set[str],
) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    on_clauses = re.findall(
        r"\bON\s+(.+?)(?:\bWHERE\b|\bGROUP\b|\bORDER\b|\bLIMIT\b|\bOFFSET\b|$)", sql, re.IGNORECASE | re.DOTALL
    )
    if not on_clauses:
        return errors
    for chunk in on_clauses:
        conds = re.split(r"\bAND\b", chunk, flags=re.IGNORECASE)
        for cond in conds:
            m = re.match(r"\s*([\w.]+)\s*=\s*([\w.]+)\s*", cond.strip())
            if not m:
                continue
            left, right = m.group(1), m.group(2)
            lt, _lc = _split_qual(left, alias_map, known_tables)
            rt, _rc = _split_qual(right, alias_map, known_tables)
            if not lt or not rt or lt == rt:
                continue
            if not _pair_allowed(lt, rt, lineage_edges):
                errors.append(
                    _err(
                        "INVALID_JOIN",
                        f"No lineage edge between '{lt}' and '{rt}'. Join only tables connected by FK metadata.",
                        f"from={lt}, to={rt}",
                    )
                )
    return errors


def validate_safety(sql: str) -> tuple[bool, list[dict[str, Any]]]:
    """Check only security-critical rules: single statement, read-only, no forbidden keywords."""
    errors: list[dict[str, Any]] = []
    core = sql.strip().rstrip(";").strip()
    if ";" in core:
        errors.append(_err("MULTIPLE_STATEMENTS", "Only a single SQL statement is allowed (no chained statements).", None))
        return False, errors
    if FORBIDDEN.search(sql):
        m = FORBIDDEN.search(sql)
        errors.append(
            _err("UNSAFE_KEYWORD", "Query contains forbidden DDL/DML keywords (write or schema change).", m.group(0) if m else None)
        )
        return False, errors
    parsed = sqlparse.parse(sql)
    if not parsed:
        errors.append(_err("PARSE_ERROR", "Empty or unparsable SQL.", None))
        return False, errors
    root = parsed[0]
    tokens = [t.value.upper() for t in root.flatten() if not t.is_whitespace]
    if not tokens:
        errors.append(_err("PARSE_ERROR", "Empty SQL.", None))
        return False, errors
    if tokens[0] not in ("SELECT", "WITH", "SHOW", "DESCRIBE", "DESC", "EXPLAIN"):
        errors.append(
            _err("INVALID_STATEMENT_TYPE", "Only read-only SELECT, WITH, SHOW, DESCRIBE, or EXPLAIN is allowed.", tokens[0])
        )
        return False, errors
    return True, []


def validate_sql(
    sql: str,
    metadata: dict[str, Any],
    lineage_edges: list[dict[str, str]],
) -> tuple[bool, list[dict[str, Any]]]:
    ok, safety_errs = validate_safety(sql)
    if not ok:
        return False, safety_errs

    errors: list[dict[str, Any]] = []
    tables_meta = {t["name"]: t for t in metadata.get("tables", [])}
    known_tables = set(tables_meta.keys())

    tables_used = _tables_from_statement(sql)
    if not tables_used:
        tables_used = _rough_tables(sql)

    cte_lower = {n.lower() for n in _cte_alias_names(sql)}
    subq_lower = _subquery_aliases(sql)
    tables_used = {t for t in tables_used if not _is_virtual_name(t, cte_lower, subq_lower)}

    resolved: dict[str, str] = {}
    for raw in tables_used:
        norm = _normalize_table(raw, known_tables)
        if not norm:
            short = raw.split(".")[-1]
            norm = _normalize_table(short, known_tables)
        if not norm:
            sample = sorted(known_tables)[:8]
            hint = f" Available scanned tables: {', '.join(sample)}"
            if len(known_tables) > 8:
                hint += f" (+{len(known_tables) - 8} more). Re-run metadata scan if a table is missing."
            else:
                hint += ". Re-run metadata scan on Connections if a table is missing."
            errors.append(
                _err(
                    "UNKNOWN_TABLE",
                    f"Table '{raw}' is not present in scanned metadata.{hint}",
                    raw,
                )
            )
        else:
            resolved[raw] = norm

    if errors:
        return False, errors

    alias_map = _extract_aliases(sql)
    col_errors = _validate_columns(sql, resolved, tables_meta, alias_map, known_tables)
    errors.extend(col_errors)

    join_errors = _validate_joins(sql, lineage_edges, resolved, alias_map, known_tables)
    errors.extend(join_errors)

    return len(errors) == 0, errors

"""Optional per-connection AI scope: restrict NL→SQL and execute validation to approved tables."""

from __future__ import annotations

import copy
from typing import Any

from app.services.lineage_read import merge_code_lineage_into_edges
from app.services.sql_validator import _normalize_table


def driver_config(conn_config: dict[str, Any]) -> dict[str, Any]:
    """Strip keys that are not database driver parameters (e.g. ai_data_scope)."""
    return {k: v for k, v in conn_config.items() if k != "ai_data_scope"}


def read_ai_data_scope(conn_config: dict[str, Any]) -> dict[str, Any]:
    raw = conn_config.get("ai_data_scope")
    return raw if isinstance(raw, dict) else {}


def table_passes_scope(table_name: str, scope: dict[str, Any]) -> bool:
    """If scope is empty, all tables pass. Otherwise apply blocklist then optional prefix whitelist."""
    if not scope:
        return True
    nf = table_name.casefold()
    blocked = scope.get("blocked_name_substrings") or []
    for b in blocked:
        if isinstance(b, str) and b.casefold() in nf:
            return False
    prefixes = scope.get("allowed_table_prefixes") or []
    if not prefixes:
        return True
    for p in prefixes:
        if isinstance(p, str) and p.strip() and nf.startswith(p.strip().casefold()):
            return True
    return False


def filter_code_nodes_by_environment(
    code_node_dicts: list[dict[str, Any]],
    scope: dict[str, Any],
) -> list[dict[str, Any]]:
    envs = scope.get("code_lineage_environments")
    if not envs or not isinstance(envs, list):
        return code_node_dicts
    allowed = {str(x).strip().upper() for x in envs if str(x).strip()}
    if not allowed:
        return code_node_dicts
    out: list[dict[str, Any]] = []
    for n in code_node_dicts:
        ev = str(n.get("environment") or "UNKNOWN").strip().upper()
        if ev in allowed:
            out.append(n)
    return out


def apply_ai_data_scope(
    metadata: dict[str, Any],
    db_edges: list[dict[str, Any]],
    conn_config: dict[str, Any],
    code_node_dicts: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    """
    Deep-copy metadata, drop tables outside scope, merge code lineage (env-filtered),
    then drop edges whose endpoints do not resolve to allowed tables.
    Returns (filtered_metadata, merged_edges_for_ai, scope_prompt_block).
    """
    scope = read_ai_data_scope(conn_config)
    meta_out = copy.deepcopy(metadata)
    tables = meta_out.get("tables") or []
    kept: list[dict[str, Any]] = []
    for t in tables:
        if not isinstance(t, dict):
            continue
        name = t.get("name")
        if not name or not isinstance(name, str):
            continue
        if table_passes_scope(name, scope):
            kept.append(t)
    meta_out["tables"] = kept
    allowed_names = {t["name"] for t in kept}

    code_filtered = filter_code_nodes_by_environment(code_node_dicts, scope)
    merged = merge_code_lineage_into_edges(list(db_edges), code_filtered)

    edges_out: list[dict[str, Any]] = []
    for e in merged:
        ft = e.get("from_table")
        tt = e.get("to_table")
        if not isinstance(ft, str) or not isinstance(tt, str):
            continue
        if not allowed_names:
            continue
        if _normalize_table(ft, allowed_names) and _normalize_table(tt, allowed_names):
            edges_out.append(e)

    active = bool(scope) and (
        bool(scope.get("allowed_table_prefixes"))
        or bool(scope.get("blocked_name_substrings"))
        or bool(scope.get("code_lineage_environments"))
    )
    prompt_block: dict[str, Any] = {
        "active": active,
        "allowed_table_prefixes": scope.get("allowed_table_prefixes") or [],
        "blocked_name_substrings": scope.get("blocked_name_substrings") or [],
        "code_lineage_environments": scope.get("code_lineage_environments") or [],
        "tables_visible_to_ai": sorted(allowed_names),
    }
    return meta_out, edges_out, prompt_block

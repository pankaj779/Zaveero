"""
Heuristic join inference when the warehouse omits FK constraints (common in lakes / legacy DBs).

Conservative rules: `*_id` columns → parent table whose name matches the entity (e.g. `customer_id` → `customers`).
Does not replace declared FKs; merged only after deduplication.
"""
from __future__ import annotations

from typing import Any


def _short_name(full: str) -> str:
    return full.split(".")[-1].lower()


def _existing_fk_keys(tables_meta: list[dict[str, Any]]) -> set[tuple[str, str, str, str]]:
    keys: set[tuple[str, str, str, str]] = set()
    for t in tables_meta:
        from_t = t.get("name")
        if not from_t:
            continue
        for fk in t.get("foreign_keys") or []:
            ref = fk.get("referenced_table")
            if not ref:
                continue
            cols = fk.get("columns") or []
            refcols = fk.get("referenced_columns") or []
            for i in range(min(len(cols), len(refcols))):
                keys.add((from_t, ref, cols[i], refcols[i]))
    return keys


def _parent_matches_entity(parent_table: str, entity: str) -> bool:
    """entity from `foo_id` → `foo`; parent short name is `foos` or `foo`."""
    sn = _short_name(parent_table)
    if sn == entity:
        return True
    if not entity:
        return False
    if sn == entity + "s":
        return True
    if entity.endswith("s") and len(entity) > 1 and sn == entity[:-1]:
        return True
    if entity.endswith("ies") and sn == entity[:-3] + "y":
        return True
    return False


def infer_join_candidates(tables_meta: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Return suggested edges not already present as declared FKs.
    Each dict: from_table, to_table, fk_column, referenced_column, confidence.
    """
    fk_keys = _existing_fk_keys(tables_meta)
    by_name = {t["name"]: t for t in tables_meta if t.get("name")}
    inferred: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()

    for t in tables_meta:
        from_t = t.get("name")
        if not from_t:
            continue
        for col in t.get("columns") or []:
            cn = (col.get("name") or "").strip()
            if not cn.lower().endswith("_id") or cn.lower() in ("id", "uuid_id"):
                continue
            entity = cn[:-3].lower()
            if len(entity) < 2:
                continue

            for parent, pmeta in by_name.items():
                if parent == from_t:
                    continue
                if not _parent_matches_entity(parent, entity):
                    continue
                pk = pmeta.get("primary_key") or []
                if not pk:
                    continue
                ref_col = pk[0]
                sig = (from_t, parent, cn, ref_col)
                if sig in fk_keys or sig in seen:
                    continue
                seen.add(sig)
                conf = "high" if _parent_matches_entity(parent, entity) else "medium"
                inferred.append(
                    {
                        "from_table": from_t,
                        "to_table": parent,
                        "fk_column": cn,
                        "referenced_column": ref_col,
                        "confidence": conf,
                    }
                )
    return inferred

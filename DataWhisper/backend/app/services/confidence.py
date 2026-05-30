"""Confidence score 0.0–1.0 from validation outcome and metadata/lineage alignment."""

from __future__ import annotations

import re
from typing import Any


def _collect_tables(sql: str, known_tables: set[str]) -> set[str]:
    found: set[str] = set()
    for m in re.finditer(r"\b(?:FROM|JOIN)\s+([`\"\w.]+)", sql, re.IGNORECASE):
        raw = m.group(1).strip().strip("`").strip('"').split()[0]
        if not raw:
            continue
        if raw in known_tables:
            found.add(raw)
            continue
        short = raw.split(".")[-1]
        for k in known_tables:
            if k.endswith("." + short) or k.split(".")[-1] == short:
                found.add(k)
                break
    return found


def compute_confidence(
    sql: str,
    metadata: dict[str, Any],
    lineage_edges: list[dict[str, str]],
    validation_ok: bool,
    validation_errors: list[dict[str, Any]],
) -> float:
    if not validation_ok:
        n = max(1, len(validation_errors))
        return round(max(0.05, 0.35 - min(0.3, 0.06 * n)), 3)

    tables_meta = metadata.get("tables") or []
    known = {t["name"] for t in tables_meta if t.get("name")}
    if not known:
        return 0.55

    used = _collect_tables(sql, known)
    score = 0.62
    if used:
        score += min(0.2, 0.04 * len(used))
    if len(used) >= 2:
        ok_pairs = 0
        total = 0
        ul = list(used)
        for i, a in enumerate(ul):
            for b in ul[i + 1 :]:
                total += 1
                if any(
                    (e["from_table"] == a and e["to_table"] == b)
                    or (e["from_table"] == b and e["to_table"] == a)
                    for e in lineage_edges
                ):
                    ok_pairs += 1
        if total > 0:
            score += 0.15 * (ok_pairs / total)
        elif lineage_edges:
            score += 0.08

    return round(min(0.99, max(0.58, score)), 3)

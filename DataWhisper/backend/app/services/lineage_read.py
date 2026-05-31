"""Merge DB FK edges with inferred edges and code-derived lineage; join-path search."""
from __future__ import annotations

import logging
from collections import defaultdict, deque
from typing import Any

logger = logging.getLogger(__name__)


def merge_fk_and_inferred(
    fk_edges: list[dict[str, Any]],
    inferred: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Dedupe by (from, to, fk_col, ref_col); FK wins over inferred."""
    seen: set[tuple[str, str, str, str]] = set()
    out: list[dict[str, Any]] = []
    for e in fk_edges:
        k = (e["from_table"], e["to_table"], e["fk_column"], e["referenced_column"])
        seen.add(k)
        o = {**e, "source": e.get("source", "fk")}
        out.append(o)
    for e in inferred:
        k = (e["from_table"], e["to_table"], e["fk_column"], e["referenced_column"])
        if k in seen:
            continue
        seen.add(k)
        out.append(
            {
                "from_table": e["from_table"],
                "to_table": e["to_table"],
                "fk_column": e["fk_column"],
                "referenced_column": e["referenced_column"],
                "source": "inferred",
                "confidence": e.get("confidence", "medium"),
            }
        )
    return out


def adjacency_from_edges(edges: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    adjacency: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for e in edges:
        src = e.get("source", "fk")
        adjacency[e["from_table"]].append(
            {
                "to": e["to_table"],
                "fk_column": e["fk_column"],
                "referenced_column": e["referenced_column"],
                "source": src,
            }
        )
        adjacency[e["to_table"]].append(
            {
                "to": e["from_table"],
                "fk_column": e["referenced_column"],
                "referenced_column": e["fk_column"],
                "reverse": True,
                "source": src,
            }
        )
    return dict(adjacency)


def get_merged_edges_from_mv(mv: Any) -> list[dict[str, Any]]:
    """Prisma MetadataVersion with lineageEdges + metadataJson.inferred_lineage_edges."""
    db_edges = [
        {
            "from_table": e.fromTable,
            "to_table": e.toTable,
            "fk_column": e.fkColumn,
            "referenced_column": e.referencedColumn,
        }
        for e in (mv.lineageEdges or [])
    ]
    meta = mv.metadataJson
    inferred: list[dict[str, Any]] = []
    if isinstance(meta, dict):
        inferred = meta.get("inferred_lineage_edges") or []
        if not isinstance(inferred, list):
            inferred = []
    return merge_fk_and_inferred(db_edges, inferred)


def shortest_join_path(
    edges: list[dict[str, Any]],
    from_table: str,
    to_table: str,
) -> tuple[list[str], list[dict[str, Any]]] | None:
    """BFS on undirected table graph. Returns (table_path, edges_along_path) or None."""
    if from_table == to_table:
        return [from_table], []
    adj: dict[str, list[tuple[str, dict[str, Any]]]] = defaultdict(list)
    for e in edges:
        a, b = e["from_table"], e["to_table"]
        adj[a].append((b, e))
        adj[b].append((a, e))
    q: deque[tuple[str, list[str], list[dict[str, Any]]]] = deque()
    q.append((from_table, [from_table], []))
    seen = {from_table}
    while q:
        node, path, ep = q.popleft()
        if node == to_table:
            return path, ep
        for nbr, edge in adj[node]:
            if nbr in seen:
                continue
            seen.add(nbr)
            q.append((nbr, path + [nbr], ep + [edge]))
    return None


def merge_code_lineage_into_edges(
    db_edges: list[dict[str, Any]],
    code_nodes: list[dict[str, Any]],
    known_tables: set[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Merge code-derived lineage into DB edges.
    When known_tables is provided, resolve code node names to scanned table names.
    """
    from app.services.table_names import resolve_table_to_known

    merged = list(db_edges)
    seen: set[tuple[str, str]] = {
        (e.get("from_table", ""), e.get("to_table", ""))
        for e in db_edges
    }

    node_map = {n["id"]: n for n in code_nodes}

    for node in code_nodes:
        parent_id = node.get("parent_node_id")
        if not parent_id or parent_id not in node_map:
            continue
        parent = node_map[parent_id]
        from_name = parent.get("node_name", "")
        to_name = node.get("node_name", "")
        if not from_name or not to_name:
            continue
        if known_tables:
            from_resolved = resolve_table_to_known(from_name, known_tables)
            to_resolved = resolve_table_to_known(to_name, known_tables)
            if not from_resolved or not to_resolved:
                continue
            from_name, to_name = from_resolved, to_resolved
        pair = (from_name, to_name)
        if pair in seen:
            continue
        seen.add(pair)
        merged.append({
            "from_table": from_name,
            "to_table": to_name,
            "fk_column": "",
            "referenced_column": "",
            "source": "code",
            "environment": node.get("environment", "UNKNOWN"),
            "source_file": node.get("source_file", ""),
            "node_type": node.get("node_type", ""),
        })

    return merged

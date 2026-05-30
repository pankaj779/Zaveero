from collections import defaultdict
from typing import Any


def build_lineage_from_fks(tables_meta: list[dict[str, Any]]) -> tuple[list[dict[str, str]], dict[str, list[dict[str, Any]]], list[str], list[str]]:
    """
    Build FK-derived lineage. Emits one stored edge per (fk column → referenced column) pair so
    multi-column foreign keys are fully represented. Fact/dimension classification uses *logical*
    table-to-table links only (one increment per referenced parent), not per physical column.
    """
    edges: list[dict[str, str]] = []
    logical_pairs: set[tuple[str, str]] = set()
    out_degree: dict[str, int] = defaultdict(int)
    in_degree: dict[str, int] = defaultdict(int)
    table_names = {t["name"] for t in tables_meta}

    for t in tables_meta:
        from_t = t["name"]
        for fk in t.get("foreign_keys") or []:
            ref = fk.get("referenced_table")
            if not ref or ref not in table_names:
                continue
            cols = fk.get("columns") or []
            refcols = fk.get("referenced_columns") or []
            if not cols or not refcols:
                continue
            n = min(len(cols), len(refcols))
            if n == 0:
                continue
            if (from_t, ref) not in logical_pairs:
                logical_pairs.add((from_t, ref))
                out_degree[from_t] += 1
                in_degree[ref] += 1
            for i in range(n):
                fk_col = cols[i]
                ref_col = refcols[i]
                edges.append(
                    {
                        "from_table": from_t,
                        "to_table": ref,
                        "fk_column": fk_col,
                        "referenced_column": ref_col,
                    }
                )

    adjacency: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for e in edges:
        adjacency[e["from_table"]].append(
            {"to": e["to_table"], "fk_column": e["fk_column"], "referenced_column": e["referenced_column"]}
        )
        adjacency[e["to_table"]].append(
            {
                "to": e["from_table"],
                "fk_column": e["referenced_column"],
                "referenced_column": e["fk_column"],
                "reverse": True,
            }
        )

    facts: list[str] = []
    dims: list[str] = []
    for t in tables_meta:
        name = t["name"]
        o, i = out_degree[name], in_degree[name]
        if o >= 2 or (o >= 1 and i == 0):
            facts.append(name)
        elif i >= 2 and o <= 1:
            dims.append(name)

    for name in table_names:
        if name not in facts and name not in dims:
            if out_degree[name] > in_degree[name]:
                facts.append(name)
            else:
                dims.append(name)

    return edges, dict(adjacency), sorted(set(facts)), sorted(set(dims))


def lineage_graph_stats(
    edges: list[dict[str, Any]],
    fact_tables: list[str],
    dimension_tables: list[str],
) -> dict[str, Any]:
    """Metrics for API/UI: hubs, edge multiplicity, FK vs inferred breakdown."""
    if not edges:
        return {
            "table_count": 0,
            "edge_count": 0,
            "fk_edge_count": 0,
            "inferred_edge_count": 0,
            "logical_fk_count": 0,
            "hub_tables": [],
            "isolated_tables": [],
        }
    nodes: set[str] = set()
    pair_counts: dict[tuple[str, str], int] = defaultdict(int)
    degree: dict[str, int] = defaultdict(int)
    for e in edges:
        a, b = e["from_table"], e["to_table"]
        nodes.add(a)
        nodes.add(b)
        pair_counts[(a, b)] += 1
        degree[a] += 1
        degree[b] += 1
    logical_fk = len({(e["from_table"], e["to_table"]) for e in edges})
    hub_tables = sorted(degree.keys(), key=lambda k: degree[k], reverse=True)[:12]
    inferred_n = sum(1 for e in edges if e.get("source") == "inferred")
    fk_n = len(edges) - inferred_n
    return {
        "table_count": len(nodes),
        "edge_count": len(edges),
        "fk_edge_count": fk_n,
        "inferred_edge_count": inferred_n,
        "logical_fk_count": logical_fk,
        "hub_tables": [{"table": t, "connections": degree[t]} for t in hub_tables],
        "fact_count": len(fact_tables),
        "dimension_count": len(dimension_tables),
    }

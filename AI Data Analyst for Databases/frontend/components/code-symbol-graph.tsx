"use client";

import dagre from "dagre";
import { memo, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── API types ─────────────────────────────────────────────────────────────

export type SymGraphResp = {
  nodes: {
    id: string;
    node_type: string;
    symbol_id: string;
    name: string;
    qualified_name: string;
    language: string | null;
    source_file: string | null;
    source_line: number | null;
    parent_id: string | null;
    metadata: Record<string, unknown>;
  }[];
  edges: {
    id: string;
    from: string;
    to: string;
    edge_type: string;
    source_file: string | null;
    source_line: number | null;
    count: number;
  }[];
  stats: { total_nodes: number; total_edges: number };
};

type SymNode = SymGraphResp["nodes"][number];
type SymEdge = SymGraphResp["edges"][number];

// ─── Visual tokens ──────────────────────────────────────────────────────────

const kindStyle: Record<string, { bg: string; border: string; text: string; accent: string; label: string }> = {
  MODULE: {
    bg: "rgba(37,99,235,0.14)",
    border: "rgba(59,130,246,0.55)",
    text: "rgb(219,234,254)",
    accent: "rgb(96,165,250)",
    label: "Module",
  },
  CLASS: {
    bg: "rgba(124,58,237,0.14)",
    border: "rgba(168,85,247,0.55)",
    text: "rgb(243,232,255)",
    accent: "rgb(192,132,252)",
    label: "Class",
  },
  FUNCTION: {
    bg: "rgba(22,163,74,0.14)",
    border: "rgba(34,197,94,0.55)",
    text: "rgb(220,252,231)",
    accent: "rgb(74,222,128)",
    label: "Function",
  },
  METHOD: {
    bg: "rgba(13,148,136,0.14)",
    border: "rgba(20,184,166,0.55)",
    text: "rgb(204,251,241)",
    accent: "rgb(45,212,191)",
    label: "Method",
  },
  EXTERNAL: {
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(148,163,184,0.45)",
    text: "rgb(241,245,249)",
    accent: "rgb(148,163,184)",
    label: "External",
  },
};

const edgeStyle: Record<string, { color: string; dashed?: boolean; label: string }> = {
  CALLS: { color: "rgb(34,197,94)", label: "calls" },
  IMPORTS: { color: "rgb(59,130,246)", label: "imports", dashed: true },
  EXTENDS: { color: "rgb(168,85,247)", label: "extends" },
  IMPLEMENTS: { color: "rgb(244,114,182)", label: "implements", dashed: true },
  INSTANTIATES: { color: "rgb(249,115,22)", label: "instantiates" },
  CONTAINS: { color: "rgba(148,163,184,0.55)", label: "contains", dashed: true },
};

const ALL_EDGE_TYPES = ["CALLS", "IMPORTS", "EXTENDS", "IMPLEMENTS", "INSTANTIATES"] as const;
type EdgeTypeId = (typeof ALL_EDGE_TYPES)[number];

const NODE_W = 238;
const NODE_H = 58;
const GAP = 56;
const ROW_LIMIT = 1680;

function shortFile(p: string | null | undefined): string {
  if (!p) return "";
  const parts = p.split("/");
  if (parts.length <= 2) return p;
  return ".../" + parts.slice(-2).join("/");
}

// ─── Layout: connected components + dagre per component + grid pack ─────────

function getComponents(nodeIds: string[], undirectedEdges: { a: string; b: string }[]): Set<string>[] {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  const add = (a: string, b: string) => {
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  };
  for (const e of undirectedEdges) add(e.a, e.b);
  const seen = new Set<string>();
  const comps: Set<string>[] = [];
  for (const id of nodeIds) {
    if (seen.has(id)) continue;
    const s = new Set<string>();
    const st = [id];
    seen.add(id);
    while (st.length) {
      const v = st.pop()!;
      s.add(v);
      for (const w of adj.get(v) || []) {
        if (!seen.has(w)) {
          seen.add(w);
          st.push(w);
        }
      }
    }
    comps.push(s);
  }
  return comps;
}

function layoutPacks(
  nodes: SymNode[],
  semanticEdges: SymEdge[],
  showContainment: boolean,
): Map<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ids = nodes.map((n) => n.id);

  const undirected: { a: string; b: string }[] = [];
  for (const e of semanticEdges) {
    undirected.push({ a: e.from, b: e.to });
  }
  if (showContainment) {
    for (const n of nodes) {
      if (n.parent_id && byId.has(n.parent_id)) {
        undirected.push({ a: n.id, b: n.parent_id });
      }
    }
  }

  const comps = getComponents(ids, undirected);
  const sortedComps = comps.sort((a, b) => b.size - a.size);

  const pos = new Map<string, { x: number; y: number }>();
  let cursorX = 40;
  let cursorY = 40;
  let rowH = 0;

  for (const comp of sortedComps) {
    const list = nodes.filter((n) => comp.has(n.id));
    if (list.length === 0) continue;

    if (list.length === 1) {
      const n = list[0];
      pos.set(n.id, { x: cursorX, y: cursorY });
      cursorX += NODE_W + GAP;
      rowH = Math.max(rowH, NODE_H + GAP);
      if (cursorX > ROW_LIMIT) {
        cursorX = 40;
        cursorY += rowH;
        rowH = 0;
      }
      continue;
    }

    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 42, ranksep: 64, marginx: 20, marginy: 20 });
    for (const n of list) g.setNode(n.id, { width: NODE_W, height: NODE_H });
    const idSet = comp;
    for (const e of semanticEdges) {
      if (idSet.has(e.from) && idSet.has(e.to)) g.setEdge(e.from, e.to);
    }
    if (showContainment) {
      for (const n of list) {
        if (n.parent_id && idSet.has(n.parent_id)) g.setEdge(n.parent_id, n.id);
      }
    }
    dagre.layout(g);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of list) {
      const p = g.node(n.id);
      if (!p) continue;
      const x0 = p.x - NODE_W / 2;
      const y0 = p.y - NODE_H / 2;
      const x1 = p.x + NODE_W / 2;
      const y1 = p.y + NODE_H / 2;
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);
    }
    if (!Number.isFinite(minX)) {
      const cols = 3;
      const rows = Math.ceil(list.length / cols);
      list.forEach((n, i) =>
        pos.set(n.id, {
          x: cursorX + (i % cols) * (NODE_W + 16),
          y: cursorY + Math.floor(i / cols) * (NODE_H + 16),
        }),
      );
      const wBox = cols * (NODE_W + 16) + GAP;
      const hBox = rows * (NODE_H + 16) + GAP;
      cursorX += wBox;
      rowH = Math.max(rowH, hBox);
    } else {
      const wBox = maxX - minX + GAP;
      const hBox = maxY - minY + GAP;
      for (const n of list) {
        const p = g.node(n.id)!;
        pos.set(n.id, {
          x: cursorX + (p.x - NODE_W / 2) - minX,
          y: cursorY + (p.y - NODE_H / 2) - minY,
        });
      }
      cursorX += wBox;
      rowH = Math.max(rowH, hBox);
    }

    if (cursorX > ROW_LIMIT) {
      cursorX = 40;
      cursorY += rowH + GAP;
      rowH = 0;
    }
  }
  return pos;
}

// ─── Custom node ────────────────────────────────────────────────────────────

type SymbolNodeData = {
  label: string;
  sub: string;
  kind: string;
  lang?: string | null;
  fullName: string;
  styleToken: (typeof kindStyle)[string];
};

const SymbolFlowNode = memo(function SymbolFlowNode({ data }: NodeProps<SymbolNodeData>) {
  const s = data.styleToken;
  return (
    <div
      className={cn(
        "relative rounded-xl px-3 py-2 min-w-[220px] max-w-[260px] shadow-md",
        "border backdrop-blur-sm transition-shadow hover:shadow-lg",
      )}
      style={{
        background: s.bg,
        borderColor: s.border,
        color: s.text,
        boxShadow: `inset 0 0 0 1px ${s.border}33, 0 4px 20px rgba(0,0,0,0.25)`,
      }}
      title={data.fullName}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-400 !border-0" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-400 !border-0" />
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
          style={{ background: s.accent }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">{data.kind}</span>
            {data.lang && (
              <span className="text-[9px] rounded bg-black/25 px-1 py-0">{data.lang}</span>
            )}
          </div>
          <div className="text-[12px] font-semibold leading-tight truncate font-mono">{data.label}</div>
          <div className="text-[10px] opacity-70 truncate font-mono mt-0.5">{data.sub}</div>
        </div>
      </div>
    </div>
  );
});

const nodeTypes = { symbolNode: SymbolFlowNode };

// ─── Component ─────────────────────────────────────────────────────────────

export function CodeSymbolGraph({
  sourceId,
  token,
  tall,
}: {
  sourceId: string;
  token: string | undefined;
  tall?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [enabledTypes, setEnabledTypes] = useState<Set<EdgeTypeId>>(() => new Set(ALL_EDGE_TYPES));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);
  const [showContainment, setShowContainment] = useState(true);

  const edgeTypesParam = useMemo(() => Array.from(enabledTypes).join(","), [enabledTypes]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["symbol-graph", sourceId, edgeTypesParam, focusId, depth],
    queryFn: () => {
      const params = new URLSearchParams();
      if (edgeTypesParam) params.set("edge_types", edgeTypesParam);
      if (focusId) {
        params.set("focus", focusId);
        params.set("depth", String(depth));
      }
      params.set("max_nodes", "700");
      return apiFetch<SymGraphResp>(
        `/crawler/sources/${sourceId}/symbol-graph?${params.toString()}`,
        token,
      );
    },
    enabled: !!token && !!sourceId,
    staleTime: 5_000,
  });

  const filtered = useMemo<SymGraphResp | undefined>(() => {
    if (!data) return data;
    const q = search.trim().toLowerCase();
    if (!q) return data;
    const keep = new Set<string>();
    for (const n of data.nodes) {
      if (
        n.name.toLowerCase().includes(q) ||
        n.qualified_name.toLowerCase().includes(q) ||
        (n.source_file || "").toLowerCase().includes(q)
      ) {
        keep.add(n.id);
      }
    }
    for (const e of data.edges) {
      if (keep.has(e.from) || keep.has(e.to)) {
        keep.add(e.from);
        keep.add(e.to);
      }
    }
    return {
      ...data,
      nodes: data.nodes.filter((n) => keep.has(n.id)),
      edges: data.edges.filter((e) => keep.has(e.from) && keep.has(e.to)),
    };
  }, [data, search]);

  const semanticEdgeCount = filtered?.edges.length ?? 0;

  const { nodes, edges } = useMemo<{ nodes: Node<SymbolNodeData>[]; edges: Edge[] }>(() => {
    if (!filtered) return { nodes: [], edges: [] };

    const positions = layoutPacks(filtered.nodes, filtered.edges, showContainment);

    const rfNodes: Node<SymbolNodeData>[] = filtered.nodes.map((n) => {
      const s = kindStyle[n.node_type] || kindStyle.EXTERNAL;
      const p = positions.get(n.id) ?? { x: 0, y: 0 };
      const sub = shortFile(n.source_file) + (n.source_line ? `:${n.source_line}` : "");
      return {
        id: n.id,
        type: "symbolNode",
        position: p,
        data: {
          label: n.name,
          sub: sub || n.symbol_id.split("::").slice(-2).join("::"),
          kind: s.label,
          lang: n.language,
          fullName: `${n.node_type} ${n.qualified_name}\n${n.symbol_id}`,
          styleToken: s,
        },
      };
    });

    const rfEdges: Edge[] = filtered.edges.map((e, i) => {
      const s = edgeStyle[e.edge_type] || { color: "rgb(148,163,184)", label: e.edge_type };
      return {
        id: `e-${i}-${e.from}-${e.to}-${e.edge_type}`,
        source: e.from,
        target: e.to,
        animated: e.edge_type === "IMPORTS",
        style: {
          stroke: s.color,
          strokeWidth: Math.min(1 + Math.log10(Math.max(1, e.count)) * 1.2, 4),
          opacity: 0.82,
          strokeDasharray: s.dashed ? "6 4" : undefined,
        },
        label: e.count > 1 ? `${s.label} ×${e.count}` : s.label,
        labelStyle: { fill: s.color, fontSize: 9, fontWeight: 500 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: "rgba(15,23,42,0.75)", opacity: 0.95 },
      };
    });

    if (showContainment) {
      const have = new Set(rfEdges.map((e) => `${e.source}|${e.target}|CONTAINS`));
      let ci = 0;
      for (const n of filtered.nodes) {
        if (!n.parent_id) continue;
        const k = `${n.parent_id}|${n.id}|CONTAINS`;
        if (have.has(k)) continue;
        if (!positions.has(n.id) || !positions.has(n.parent_id)) continue;
        have.add(k);
        rfEdges.push({
          id: `c-${ci++}-${n.parent_id}-${n.id}`,
          source: n.parent_id,
          target: n.id,
          style: {
            stroke: edgeStyle.CONTAINS.color,
            strokeWidth: 1,
            opacity: 0.45,
            strokeDasharray: "4 6",
          },
        });
      }
    }

    return { nodes: rfNodes, edges: rfEdges };
  }, [filtered, showContainment]);

  const onNodeClick = useCallback((_: unknown, n: Node) => setFocusId(n.id), []);

  const toggleEdgeType = (t: EdgeTypeId) =>
    setEnabledTypes((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--muted))]/20 to-transparent p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading code structure…
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/12 p-10 text-center text-sm text-[hsl(var(--muted-foreground))] space-y-2">
        <p>No symbol graph for this source yet.</p>
        <p className="text-xs">
          Git crawls populate this after the <strong>SYMBOLS</strong> pipeline step. REST/API sources expose OpenAPI routes on the{" "}
          <strong>Unified data graph</strong> tab instead.
        </p>
      </div>
    );
  }

  const focusedNode = focusId ? data.nodes.find((n) => n.id === focusId) : null;

  return (
    <div className="space-y-4">
      {semanticEdgeCount === 0 && !search && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
          No <strong>semantic</strong> edges match your filters (calls / imports / …). Enable{" "}
          <strong>imports</strong> if you mostly see modules, or turn on <strong>Show file tree</strong> below to link
          class/method containment.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          {Object.entries(kindStyle).map(([k, s]) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))]/60 px-2 py-0.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.accent }} />
              <span className="text-[hsl(var(--muted-foreground))]">{s.label}</span>
            </span>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name or file…"
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs w-72 shadow-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-[hsl(var(--muted-foreground))] mr-1">Edges:</span>
        {ALL_EDGE_TYPES.map((t) => {
          const s = edgeStyle[t];
          const on = enabledTypes.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleEdgeType(t)}
              className={cn(
                "rounded-lg px-2.5 py-1 border text-[10px] font-medium transition-all",
                on ? "shadow-sm" : "opacity-55",
              )}
              style={{
                borderColor: on ? s.color : "hsl(var(--border))",
                background: on ? `${s.color}22` : "transparent",
                color: on ? s.color : "hsl(var(--muted-foreground))",
              }}
            >
              {s.label}
            </button>
          );
        })}
        <label className="inline-flex items-center gap-1.5 ml-2 cursor-pointer text-[hsl(var(--muted-foreground))]">
          <input
            type="checkbox"
            checked={showContainment}
            onChange={(e) => setShowContainment(e.target.checked)}
          />
          File tree (nesting)
        </label>
      </div>

      {focusedNode && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] rounded-lg border border-[hsl(var(--primary))]/35 bg-[hsl(var(--primary))]/10 px-3 py-2">
          <span className="text-[hsl(var(--primary))] font-medium">Focus</span>
          <span className="font-mono truncate max-w-md">{focusedNode.qualified_name}</span>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-0.5 text-[10px]"
          >
            {[1, 2, 3, 4].map((d) => (
              <option key={d} value={d}>
                ±{d} hops
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline-offset-2 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div
        className="rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-inner bg-[hsl(var(--muted))]/8"
        style={{ height: tall ? 760 : 620 }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
          minZoom={0.08}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
          onNodeClick={onNodeClick}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background gap={22} size={1} color="hsl(var(--border) / 0.35)" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={2}
            zoomable
            pannable
            maskColor="rgba(0,0,0,0.42)"
            className="!bg-[hsl(var(--card))]/90 !border !border-[hsl(var(--border))] rounded-lg"
            position="bottom-left"
          />
          <Panel position="top-right" className="flex gap-1">
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[10px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 shadow-sm hover:bg-[hsl(var(--muted))]/30"
            >
              Refresh
            </button>
          </Panel>
        </ReactFlow>
      </div>

      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
        {data.stats.total_nodes} symbols · {data.stats.total_edges} saved edges · layout packs disconnected parts side-by-side
        {data.stats.total_nodes >= 700 ? " — showing top 700 by connectivity; filter or focus to narrow." : ""}
      </p>
    </div>
  );
}

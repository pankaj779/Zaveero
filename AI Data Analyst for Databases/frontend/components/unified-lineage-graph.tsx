"use client";

import dagre from "dagre";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { apiFetch } from "@/lib/api";

// ─── API types ─────────────────────────────────────────────────────────────

type UnifiedResp = {
  workspace_id: string;
  code_lineage_nodes: {
    id: string;
    source: "code";
    node_type: string;
    node_name: string;
    source_file: string | null;
    environment: string;
    parent_node_id: string | null;
    metadata: Record<string, unknown> | null;
  }[];
  db_lineage_edges: {
    id: string;
    source: "db_fk";
    from_table: string;
    to_table: string;
    connection_id: string;
    connection_name: string | null;
  }[];
  total_code_nodes: number;
  total_db_edges: number;
};

// ─── Heuristics for visual styling per node kind ───────────────────────────

type NodeKind =
  | "code"
  | "db_table"
  | "s3"
  | "mongo"
  | "kafka"
  | "api"
  | "git"
  | "other";

function kindOf(name: string, source: "code" | "db_fk"): NodeKind {
  if (source === "db_fk") return "db_table";
  const n = name.toLowerCase();
  if (n.startsWith("s3://")) return "s3";
  if (n.startsWith("mongo://")) return "mongo";
  if (n.startsWith("kafka://")) return "kafka";
  if (n.startsWith("api://") || n.startsWith("http://") || n.startsWith("https://")) return "api";
  if (n.startsWith("git@") || n.includes("github.com") || n.includes("gitlab.com")) return "git";
  return "code";
}

const kindStyle: Record<NodeKind, { bg: string; border: string; text: string; label: string }> = {
  code:     { bg: "rgba(34,197,94,0.15)",  border: "rgb(34,197,94)",   text: "rgb(220,252,231)", label: "Code"  },
  db_table: { bg: "rgba(59,130,246,0.18)", border: "rgb(59,130,246)",  text: "rgb(219,234,254)", label: "Table" },
  s3:       { bg: "rgba(14,165,233,0.18)", border: "rgb(14,165,233)",  text: "rgb(207,250,254)", label: "S3"    },
  mongo:    { bg: "rgba(132,204,22,0.18)", border: "rgb(132,204,22)",  text: "rgb(236,252,203)", label: "Mongo" },
  kafka:    { bg: "rgba(249,115,22,0.18)", border: "rgb(249,115,22)",  text: "rgb(255,237,213)", label: "Kafka" },
  api:      { bg: "rgba(168,85,247,0.18)", border: "rgb(168,85,247)",  text: "rgb(243,232,255)", label: "API"   },
  git:      { bg: "rgba(244,114,182,0.18)",border: "rgb(244,114,182)", text: "rgb(252,231,243)", label: "Repo"  },
  other:    { bg: "rgba(148,163,184,0.18)",border: "rgb(148,163,184)", text: "rgb(241,245,249)", label: "Node"  },
};

const shortLabel = (n: string) => {
  if (n.length <= 40) return n;
  return "…" + n.slice(-37);
};

// ─── Build graph data with dagre layout ────────────────────────────────────

function useDagreGraph(data: UnifiedResp | undefined): { nodes: Node[]; edges: Edge[] } {
  return useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const g = new dagre.graphlib.Graph<{}>().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 80, marginx: 20, marginy: 20 });

    type NodeMeta = { kind: NodeKind; label: string; tooltip: string };
    const nodeMap = new Map<string, NodeMeta>();

    const addNode = (id: string, kind: NodeKind, label: string, tooltip: string) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, { kind, label, tooltip });
        g.setNode(id, { width: 220, height: 50 });
      }
    };

    // Code lineage
    for (const n of data.code_lineage_nodes) {
      const kind = kindOf(n.node_name, n.source);
      addNode(n.node_name, kind, shortLabel(n.node_name),
              `${n.node_type}\n${n.environment}${n.source_file ? `\nfrom ${n.source_file}` : ""}`);
    }
    for (const n of data.code_lineage_nodes) {
      if (!n.parent_node_id) continue;
      const parent = data.code_lineage_nodes.find((p) => p.id === n.parent_node_id);
      if (!parent) continue;
      g.setEdge(parent.node_name, n.node_name, { source: "code" });
    }

    // DB FK lineage
    for (const e of data.db_lineage_edges) {
      const from = `${e.connection_name || "db"}::${e.from_table}`;
      const to = `${e.connection_name || "db"}::${e.to_table}`;
      addNode(from, "db_table", shortLabel(e.from_table), `${e.connection_name || "db"} · ${e.from_table}`);
      addNode(to, "db_table", shortLabel(e.to_table), `${e.connection_name || "db"} · ${e.to_table}`);
      g.setEdge(from, to, { source: "db_fk" });
    }

    dagre.layout(g);

    const nodes: Node[] = [];
    nodeMap.forEach((meta, id) => {
      const pos = g.node(id);
      if (!pos) return;
      const s = kindStyle[meta.kind];
      nodes.push({
        id,
        position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
        // React Flow renders `data.label` as the node body; we also stash the
        // tooltip on `data` so a custom node component (or the hover title via
        // CSS) can pick it up later.
        data: { label: meta.label, tooltip: meta.tooltip },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: s.bg,
          color: s.text,
          border: `1.5px solid ${s.border}`,
          borderRadius: 8,
          fontSize: 11,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          padding: "6px 10px",
          width: pos.width,
        },
      });
    });

    const edges: Edge[] = [];
    g.edges().forEach((e, i) => {
      const meta = (g.edge(e) as { source?: string }) || {};
      const color = meta.source === "db_fk" ? "rgb(59,130,246)" : "rgb(34,197,94)";
      edges.push({
        id: `e-${i}-${e.v}-${e.w}`,
        source: e.v,
        target: e.w,
        animated: meta.source === "db_fk",
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.65 },
      });
    });
    return { nodes, edges };
  }, [data]);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function UnifiedLineageGraph() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lineage-unified"],
    queryFn: () => apiFetch<UnifiedResp>("/crawler/lineage/unified", token),
    enabled: !!token,
    refetchInterval: 10_000,
  });

  const symTypes = useMemo(
    () => new Set(["module", "class", "function", "method", "external", "interface", "trait", "enum"]),
    [],
  );

  const dataForGraph = useMemo(() => {
    if (!data) return data;
    return {
      ...data,
      code_lineage_nodes: data.code_lineage_nodes.filter((n) => !symTypes.has(n.node_type.toLowerCase())),
    };
  }, [data, symTypes]);

  const filtered = useMemo<UnifiedResp | undefined>(() => {
    if (!dataForGraph) return dataForGraph;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return dataForGraph;
    const keepNodeIds = new Set<string>();
    dataForGraph.code_lineage_nodes.forEach((n) => {
      if (n.node_name.toLowerCase().includes(q)) keepNodeIds.add(n.id);
    });
    let changed = true;
    while (changed) {
      changed = false;
      dataForGraph.code_lineage_nodes.forEach((n) => {
        if (n.parent_node_id && keepNodeIds.has(n.id) && !keepNodeIds.has(n.parent_node_id)) {
          keepNodeIds.add(n.parent_node_id);
          changed = true;
        }
        if (n.parent_node_id && keepNodeIds.has(n.parent_node_id) && !keepNodeIds.has(n.id)) {
          keepNodeIds.add(n.id);
          changed = true;
        }
      });
    }
    return {
      ...dataForGraph,
      code_lineage_nodes: dataForGraph.code_lineage_nodes.filter((n) => keepNodeIds.has(n.id)),
      db_lineage_edges: dataForGraph.db_lineage_edges.filter(
        (e) => e.from_table.toLowerCase().includes(q) || e.to_table.toLowerCase().includes(q),
      ),
    };
  }, [dataForGraph, searchTerm]);

  const { nodes, edges } = useDagreGraph(filtered);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/15 p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading lineage…
      </div>
    );
  }

  if (!dataForGraph || (dataForGraph.code_lineage_nodes.length === 0 && dataForGraph.db_lineage_edges.length === 0)) {
    return (
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/15 p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
        No lineage yet. Run a crawl on a Git repo, or scan a DB connection.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {Object.entries(kindStyle).map(([k, s]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ background: s.bg, border: `1.5px solid ${s.border}` }}
              />
              <span className="text-[hsl(var(--muted-foreground))]">{s.label}</span>
            </span>
          ))}
        </div>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter nodes by name…"
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs w-64"
        />
      </div>

      <div
        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/15"
        style={{ height: 600 }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="hsl(var(--border))" />
          <Controls position="bottom-right" />
          <MiniMap
            nodeColor={(n) => (n.style?.borderColor as string) || "#64748b"}
            maskColor="rgba(0,0,0,0.4)"
            style={{ background: "hsl(var(--card))" }}
            position="bottom-left"
          />
        </ReactFlow>
      </div>

      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
        {dataForGraph.total_code_nodes} data-flow nodes · {dataForGraph.total_db_edges} DB FK edges · auto-refreshes every 10s
      </p>
    </div>
  );
}

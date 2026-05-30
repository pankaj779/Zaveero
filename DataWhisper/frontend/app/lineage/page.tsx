"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const CodeSymbolGraph = dynamic(
  () => import("@/components/code-symbol-graph").then((m) => m.CodeSymbolGraph),
  { ssr: false, loading: () => <div className="p-8 text-sm text-[hsl(var(--muted-foreground))]">Loading graph…</div> }
);
const UnifiedLineageGraph = dynamic(
  () => import("@/components/unified-lineage-graph").then((m) => m.UnifiedLineageGraph),
  { ssr: false, loading: () => <div className="p-8 text-sm text-[hsl(var(--muted-foreground))]">Loading graph…</div> }
);
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Edge = {
  from_table: string;
  to_table: string;
  fk_column: string;
  referenced_column: string;
  source?: string;
  confidence?: string;
  environment?: string;
  source_file?: string;
  node_type?: string;
};

type LineageResponse = {
  connection_id: string;
  version: number;
  edges: Edge[];
  fact_tables: string[];
  dimension_tables: string[];
  stats: {
    table_count: number;
    edge_count: number;
    fk_edge_count?: number;
    inferred_edge_count?: number;
    logical_fk_count: number;
    hub_tables: { table: string; connections: number }[];
    fact_count?: number;
    dimension_count?: number;
  } | null;
};

type PathResponse = {
  found: boolean;
  table_path: string[];
  edges: Edge[];
  from_table: string;
  to_table: string;
  version: number;
};

type Conn = { id: string; name: string; type: string };

type CrawlSource = {
  id: string;
  name: string;
  source_type: string;
  status: string;
};

function roleOf(
  table: string,
  facts: string[],
  dims: string[]
): "fact" | "dimension" | "other" {
  if (facts.includes(table)) return "fact";
  if (dims.includes(table)) return "dimension";
  return "other";
}

function LineageSvg({
  edges,
  facts,
  dims,
}: {
  edges: Edge[];
  facts: string[];
  dims: string[];
}) {
  const { nodes, links } = useMemo(() => {
    const tables = new Set<string>();
    edges.forEach((e) => {
      tables.add(e.from_table);
      tables.add(e.to_table);
    });
    const list = Array.from(tables).sort();
    const n = Math.max(list.length, 1);
    const cx = 420;
    const cy = 320;
    const r = Math.min(260, 120 + n * 8);
    const nodeList = list.map((t, i) => {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        id: t,
        x: cx + r * Math.cos(ang),
        y: cy + r * Math.sin(ang),
        role: roleOf(t, facts, dims),
      };
    });
    const pos: Record<string, { x: number; y: number }> = {};
    nodeList.forEach((o) => {
      pos[o.id] = { x: o.x, y: o.y };
    });
    const seen = new Set<string>();
    const inferredPair = new Set<string>();
    const codePair = new Set<string>();
    edges.forEach((e) => {
      const und = [e.from_table, e.to_table].sort().join("\0");
      if (e.source === "inferred") inferredPair.add(und);
      if (e.source === "code") codePair.add(und);
    });
    const linkList: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      key: string;
      inferred: boolean;
      code: boolean;
    }[] = [];
    edges.forEach((e, idx) => {
      const a = pos[e.from_table];
      const b = pos[e.to_table];
      if (!a || !b) return;
      const k = `${e.from_table}|${e.to_table}|${e.fk_column}|${idx}`;
      const pairKey = `${e.from_table}|${e.to_table}`;
      if (seen.has(pairKey)) return;
      seen.add(pairKey);
      const und = [e.from_table, e.to_table].sort().join("\0");
      linkList.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        key: k,
        inferred: inferredPair.has(und),
        code: codePair.has(und),
      });
    });
    return { nodes: nodeList, links: linkList };
  }, [edges, facts, dims]);

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))] py-8 text-center">
        No tables in lineage yet. Run a metadata scan on a connection that exposes foreign keys.
      </p>
    );
  }

  return (
    <div className="w-full overflow-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
      <svg viewBox="0 0 840 640" className="w-full h-auto min-h-[400px]">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--primary))" opacity="0.5" />
          </marker>
        </defs>
        {links.map((L) => (
          <line
            key={L.key}
            x1={L.x1}
            y1={L.y1}
            x2={L.x2}
            y2={L.y2}
            stroke={L.code ? "rgb(34 197 94)" : L.inferred ? "rgb(168 85 247)" : "hsl(var(--primary))"}
            strokeWidth={L.code ? 1.5 : L.inferred ? 1.25 : 1.5}
            strokeOpacity={L.code ? 0.7 : L.inferred ? 0.55 : 0.35}
            strokeDasharray={L.code ? "3 4" : L.inferred ? "6 5" : undefined}
          />
        ))}
        {nodes.map((n) => {
          const fill =
            n.role === "fact"
              ? "rgba(251, 191, 36, 0.95)"
              : n.role === "dimension"
                ? "rgba(96, 165, 250, 0.95)"
                : "hsl(var(--muted-foreground) / 0.35)";
          const short = n.id.includes(".") ? n.id.split(".").slice(-2).join(".") : n.id;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={14} fill={fill} stroke="hsl(var(--border))" strokeWidth={1} />
              <text
                x={n.x}
                y={n.y + 28}
                textAnchor="middle"
                className="fill-[hsl(var(--foreground))] text-[10px] font-medium"
                style={{ fontFamily: "ui-sans-serif, system-ui" }}
              >
                {short.length > 22 ? short.slice(0, 20) + "…" : short}
              </text>
              <title>{n.id}</title>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 px-4 pb-3 text-xs text-[hsl(var(--muted-foreground))]">
        <span>
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400/90 mr-1 align-middle" /> Fact
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-full bg-blue-400/90 mr-1 align-middle" /> Dimension
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-full bg-muted-foreground/35 mr-1 align-middle" /> Other
        </span>
        <span>
          <span
            className="inline-block w-8 h-0.5 align-middle mr-1 bg-purple-500/80"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgb(168 85 247), rgb(168 85 247) 4px, transparent 4px, transparent 8px)",
            }}
          />{" "}
          Inferred join
        </span>
        <span>
          <span
            className="inline-block w-8 h-0.5 align-middle mr-1 bg-green-500/80"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgb(34 197 94), rgb(34 197 94) 3px, transparent 3px, transparent 7px)",
            }}
          />{" "}
          Code lineage
        </span>
      </div>
    </div>
  );
}

function LineagePageInner() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeTab =
    tabFromUrl === "connection" || tabFromUrl === "code" || tabFromUrl === "unified"
      ? tabFromUrl
      : "unified";

  const setTab = (t: "unified" | "connection" | "code") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", t);
    router.replace(`/lineage?${next.toString()}`, { scroll: false });
  };

  const [connectionId, setConnectionId] = useState<string>("");
  const [codeSourceId, setCodeSourceId] = useState<string>("");
  const [pathFrom, setPathFrom] = useState("");
  const [pathTo, setPathTo] = useState("");
  const [pathData, setPathData] = useState<PathResponse | null>(null);
  const [pathErr, setPathErr] = useState<string | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  async function findJoinPath() {
    if (!connectionId || !pathFrom.trim() || !pathTo.trim() || !token) return;
    setPathLoading(true);
    setPathErr(null);
    try {
      const q = new URLSearchParams({
        from_table: pathFrom.trim(),
        to_table: pathTo.trim(),
      });
      const d = await apiFetch<PathResponse>(`/lineage/${connectionId}/path?${q.toString()}`, token);
      setPathData(d);
    } catch (e) {
      setPathErr(e instanceof Error ? e.message : "Path lookup failed");
      setPathData(null);
    } finally {
      setPathLoading(false);
    }
  }

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => apiFetch<Conn[]>("/connections", token),
    enabled: !!token,
  });

  const { data: crawlSources = [] } = useQuery({
    queryKey: ["crawler-sources"],
    queryFn: () => apiFetch<CrawlSource[]>("/crawler/sources", token),
    enabled: !!token,
  });

  useEffect(() => {
    const s = searchParams.get("source");
    if (s && crawlSources.some((c) => c.id === s)) {
      setCodeSourceId(s);
    }
  }, [searchParams, crawlSources]);

  useEffect(() => {
    if (activeTab !== "code") return;
    if (codeSourceId) return;
    if (crawlSources.length > 0) {
      setCodeSourceId(crawlSources[0].id);
    }
  }, [activeTab, codeSourceId, crawlSources]);

  const { data: lineage, isLoading } = useQuery({
    queryKey: ["lineage", connectionId],
    queryFn: () => apiFetch<LineageResponse>(`/lineage/${connectionId}`, token),
    enabled: !!token && !!connectionId,
  });

  useEffect(() => {
    setPathData(null);
    setPathErr(null);
    setPathFrom("");
    setPathTo("");
  }, [connectionId]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lineage</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-3xl">
          <strong>Unified data graph</strong> — warehouses, files, APIs, buckets (data flow).{" "}
          <strong>Code structure</strong> — functions, classes, and calls (tree-sitter), separate from data flow.{" "}
          <strong>Connection FK graph</strong> — foreign keys for one database.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-1 flex-wrap gap-0.5">
        {(
          [
            ["unified", "Unified data graph"],
            ["code", "Code structure"],
            ["connection", "Connection FK graph"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
              activeTab === t
                ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "unified" && (
        <Card>
          <CardHeader>
            <CardTitle>Unified data graph</CardTitle>
            <CardDescription>
              Data flow only: SQL/table lineage, REST routes from OpenAPI, S3, Kafka, Mongo, and FK-linked
              tables. <strong>Not</strong> mixed with the function call graph — use the <strong>Code structure</strong> tab for that.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UnifiedLineageGraph />
          </CardContent>
        </Card>
      )}

      {activeTab === "code" && (
        <Card>
          <CardHeader>
            <CardTitle>Code structure graph</CardTitle>
            <CardDescription>
              Parsed with tree-sitter: modules, classes, functions, and edges for calls, imports, inheritance,
              and instantiation. Pick a crawl source that has completed a Git crawl (SYMBOLS step).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-1 min-w-[200px] max-w-md">
                <Label htmlFor="crawl-src">Crawl source</Label>
                <select
                  id="crawl-src"
                  className="w-full rounded-md border border-[hsl(var(--border))] bg-background px-3 py-2 text-sm"
                  value={codeSourceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCodeSourceId(id);
                    const next = new URLSearchParams(searchParams.toString());
                    next.set("tab", "code");
                    if (id) next.set("source", id); else next.delete("source");
                    router.replace(`/lineage?${next.toString()}`, { scroll: false });
                  }}
                >
                  <option value="">— Select —</option>
                  {crawlSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.source_type}) — {s.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {codeSourceId ? (
              <CodeSymbolGraph sourceId={codeSourceId} token={token} tall />
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Add a source under Crawler and run a crawl, then select it here.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "connection" && (
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Pick a connection that has completed at least one metadata scan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="conn">Connection</Label>
            <select
              id="conn"
              className="w-full max-w-md rounded-md border border-[hsl(var(--border))] bg-background px-3 py-2 text-sm"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
            >
              <option value="">— Select —</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {activeTab === "connection" && connectionId && (
        <Card>
          <CardHeader>
            <CardTitle>Shortest join path</CardTitle>
            <CardDescription>
              BFS on the merged graph (FK + inferred). Use exact table names as in metadata (often{" "}
              <code className="text-xs bg-[hsl(var(--muted))]/50 px-1 rounded">schema.table</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-3xl">
              <div className="flex-1 space-y-1">
                <Label htmlFor="path-from">From table</Label>
                <Input
                  id="path-from"
                  placeholder="e.g. public.orders"
                  value={pathFrom}
                  onChange={(e) => setPathFrom(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="path-to">To table</Label>
                <Input
                  id="path-to"
                  placeholder="e.g. public.customers"
                  value={pathTo}
                  onChange={(e) => setPathTo(e.target.value)}
                />
              </div>
              <Button type="button" onClick={() => void findJoinPath()} disabled={pathLoading}>
                {pathLoading ? "Finding…" : "Find path"}
              </Button>
            </div>
            {pathErr && <p className="text-sm text-destructive">{pathErr}</p>}
            {pathData && (
              <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/15 p-3 text-sm space-y-2">
                {!pathData.found ? (
                  <p className="text-[hsl(var(--muted-foreground))]">No path between these tables in the current graph.</p>
                ) : (
                  <>
                    <p className="font-medium">
                      {pathData.table_path.length} tables · {pathData.edges.length} hop
                      {pathData.edges.length === 1 ? "" : "s"}
                    </p>
                    <p className="font-mono text-xs break-all">{pathData.table_path.join(" → ")}</p>
                    {pathData.edges.length > 0 && (
                      <ul className="text-xs space-y-1 list-disc list-inside text-[hsl(var(--muted-foreground))]">
                        {pathData.edges.map((e, i) => (
                          <li key={i}>
                            <span className="font-mono text-[hsl(var(--foreground))]">
                              {e.from_table}.{e.fk_column}
                            </span>{" "}
                            →{" "}
                            <span className="font-mono text-[hsl(var(--foreground))]">
                              {e.to_table}.{e.referenced_column}
                            </span>
                            {e.source === "inferred" && (
                              <span className="ml-1 text-purple-600 dark:text-purple-400">(inferred)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "connection" && connectionId && (
        <Card>
          <CardHeader>
            <CardTitle>Graph</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading…"
                : lineage
                  ? `Version ${lineage.version} · ${lineage.stats?.fk_edge_count ?? "—"} FK column links · ${lineage.stats?.inferred_edge_count ?? 0} inferred · ${lineage.stats?.logical_fk_count ?? "—"} logical table pairs`
                  : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">Loading lineage…</p>}
            {!isLoading && lineage && (
              <>
                {lineage.stats?.hub_tables && lineage.stats.hub_tables.length > 0 && (
                  <div className="mb-4 text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Most connected tables: </span>
                    {lineage.stats.hub_tables.slice(0, 6).map((h, i) => (
                      <span key={h.table}>
                        {i > 0 ? " · " : ""}
                        <code className="text-xs bg-[hsl(var(--muted))]/50 px-1 rounded">{h.table}</code>
                        <span className="text-[hsl(var(--muted-foreground))]"> ({h.connections})</span>
                      </span>
                    ))}
                  </div>
                )}
                <LineageSvg edges={lineage.edges} facts={lineage.fact_tables} dims={lineage.dimension_tables} />
                {lineage.edges.length > 0 && (
                  <div className="mt-6 overflow-x-auto">
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                      Edges (merged FK + inferred)
                    </p>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-left">
                          <th className="py-1 pr-2">From</th>
                          <th className="py-1 pr-2">Column</th>
                          <th className="py-1 pr-2">To</th>
                          <th className="py-1 pr-2">Ref column</th>
                          <th className="py-1">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineage.edges.slice(0, 80).map((e, i) => (
                          <tr key={i} className="border-b border-[hsl(var(--border))]/60">
                            <td className="py-1 pr-2 font-mono">{e.from_table}</td>
                            <td className="py-1 pr-2">{e.fk_column}</td>
                            <td className="py-1 pr-2 font-mono">{e.to_table}</td>
                            <td className="py-1 pr-2">{e.referenced_column}</td>
                            <td className="py-1">
                              {e.source === "code" ? (
                                <span className="text-green-600 dark:text-green-400">code</span>
                              ) : e.source === "inferred" ? (
                                <span className="text-purple-600 dark:text-purple-400">inferred</span>
                              ) : (
                                <span className="text-[hsl(var(--muted-foreground))]">FK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lineage.edges.length > 80 && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                        Showing 80 of {lineage.edges.length} edges.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LineagePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-[hsl(var(--muted-foreground))]">Loading lineage…</div>
      }
    >
      <LineagePageInner />
    </Suspense>
  );
}

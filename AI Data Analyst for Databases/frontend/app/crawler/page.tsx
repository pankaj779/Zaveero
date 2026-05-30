"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cloud,
  Database,
  GitBranch,
  Globe,
  HelpCircle,
  Loader2,
  Pencil,
  Radio,
  Search,
  Workflow,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type CrawlSource = {
  id: string;
  name: string;
  source_type: string;
  status: "READY" | "CRAWLING" | "DONE" | "ERROR" | "PENDING_AUTH";
  last_crawled_at: string | null;
  created_at: string;
  parent_crawl_source_id: string | null;
  origin_discovery_id: string | null;
};

type PipelineStep = {
  name: string;
  status: "pending" | "running" | "done" | "failed";
  started_at: string | null;
  completed_at: string | null;
  message: string | null;
};

type CrawlSession = {
  id: string;
  status: string;
  files_scanned: number;
  edges_found: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  pipeline_steps: PipelineStep[];
  discoveries_found: number;
};

type CodeLineageNodeOut = {
  id: string;
  node_type: string;
  node_name: string;
  source_file: string | null;
  environment: string;
  parent_node_id: string | null;
};

type DiscoveredResource = {
  id: string;
  crawl_source_id: string;
  kind: string;
  uri: string;
  display_name: string;
  detail: Record<string, unknown> | null;
  source_file: string | null;
  status: "PENDING_AUTH" | "CONNECTED" | "SKIPPED" | "FAILED";
  child_crawl_source_id: string | null;
  child_connection_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

type ConnectorField = {
  name: string;
  label: string;
  type: "text" | "password" | "email" | "number" | "url" | "select" | "multiline";
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: string;
  default?: string | number;
  options?: string[];
  prefill_from?: string;
};

type ConnectorSpec = {
  kind: string;
  category: "code" | "database" | "storage" | "pipeline" | "api" | "messaging" | "other";
  label: string;
  description?: string;
  creates: "crawl_source" | "db_connection" | "discovery_only";
  target_source_type?: string;
  target_db_type?: string;
  icon?: string;
  fields: ConnectorField[];
};

type SpecsResp = { specs: ConnectorSpec[] };

// ─── Constants ─────────────────────────────────────────────────────────────

const SOURCE_TYPE_OPTIONS = ["GITHUB", "GITLAB", "BITBUCKET", "CUSTOM"] as const;

const statusColors: Record<string, { bg: string; text: string; pulse?: boolean }> = {
  READY: { bg: "bg-blue-500/20", text: "text-blue-300" },
  CRAWLING: { bg: "bg-amber-500/20", text: "text-amber-300", pulse: true },
  DONE: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  ERROR: { bg: "bg-red-500/20", text: "text-red-300" },
  PENDING_AUTH: { bg: "bg-orange-500/20", text: "text-orange-300" },
};

const categoryIcon: Record<ConnectorSpec["category"], React.ComponentType<{ className?: string }>> = {
  code: GitBranch,
  database: Database,
  storage: Cloud,
  api: Globe,
  pipeline: Workflow,
  messaging: Radio,
  other: HelpCircle,
};

// ─── Tiny UI helpers ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = statusColors[status] ?? { bg: "bg-gray-500/20", text: "text-gray-300" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        s.bg,
        s.text,
        s.pulse && "animate-pulse",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.text.replace("text-", "bg-"))} />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[hsl(var(--primary))]/15 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--primary))]">
      {type}
    </span>
  );
}

// ─── Live pipeline timeline ────────────────────────────────────────────────

function PipelineTimeline({ steps }: { steps: PipelineStep[] }) {
  // If the backend emits CONNECT (native scanners) we render in that order;
  // otherwise the default Git pipeline (PREPARE → CLONE → SCAN → SYMBOLS → DISCOVER → PERSIST → DONE).
  const hasConnect = steps.some((s) => s.name === "CONNECT");
  const order = hasConnect
    ? ["PREPARE", "CONNECT", "SCAN", "PERSIST", "DONE"]
    : ["PREPARE", "CLONE", "SCAN", "SYMBOLS", "DISCOVER", "PERSIST", "DONE"];
  const byName = new Map(steps.map((s) => [s.name, s]));
  const ordered = order.map((n) => byName.get(n) ?? { name: n, status: "pending" as const, started_at: null, completed_at: null, message: null });

  return (
    <ol className="space-y-2">
      {ordered.map((s, i) => {
        const Icon =
          s.status === "done" ? CheckCircle2
          : s.status === "failed" ? AlertTriangle
          : s.status === "running" ? Loader2
          : CircleDot;
        const tone =
          s.status === "done" ? "text-emerald-400"
          : s.status === "failed" ? "text-red-400"
          : s.status === "running" ? "text-amber-300"
          : "text-[hsl(var(--muted-foreground))]";
        return (
          <li key={s.name} className="flex items-start gap-3">
            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", tone, s.status === "running" && "animate-spin")} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {i + 1}. {s.name}
                </p>
                <span className={cn("text-[10px] uppercase tracking-wider", tone)}>
                  {s.status}
                </span>
              </div>
              {s.message && (
                <p className={cn(
                  "text-xs mt-0.5 break-words whitespace-pre-line",
                  s.status === "failed" ? "text-red-300" : "text-[hsl(var(--muted-foreground))]",
                )}>
                  {s.message}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Dynamic credential dialog ─────────────────────────────────────────────

function DiscoveryConnectDialog({
  open, onClose, discovery, spec, onSubmit, busy, error,
}: {
  open: boolean;
  onClose: () => void;
  discovery: DiscoveredResource | null;
  spec: ConnectorSpec | null;
  onSubmit: (name: string, credentials: Record<string, unknown>) => void;
  busy: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!discovery || !spec) return;
    setName(discovery.display_name || spec.label);
    const initial: Record<string, unknown> = {};
    const detail = (discovery.detail || {}) as Record<string, unknown>;
    for (const f of spec.fields) {
      if (f.prefill_from && detail[f.prefill_from] != null) {
        initial[f.name] = detail[f.prefill_from];
      } else if (f.default != null) {
        initial[f.name] = f.default;
      }
    }
    setValues(initial);
  }, [discovery, spec]);

  if (!open || !discovery || !spec) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[hsl(var(--border))] p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Connect discovered resource
            </p>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mt-0.5">
              {spec.label}
            </h3>
            {spec.description && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-md">
                {spec.description}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3 text-xs">
            <p className="text-[hsl(var(--muted-foreground))]">Discovered URI</p>
            <p className="font-mono text-[hsl(var(--foreground))] break-all mt-0.5">{discovery.uri}</p>
            {discovery.source_file && (
              <p className="text-[hsl(var(--muted-foreground))] mt-1">
                from <span className="font-mono">{discovery.source_file}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conn-name">Name</Label>
            <Input
              id="conn-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A friendly name for this connection"
            />
          </div>

          {spec.fields.map((f) => {
            const val = (values[f.name] ?? "") as string | number;
            const onChange = (v: string | number) =>
              setValues((s) => ({ ...s, [f.name]: v }));

            if (f.type === "select") {
              return (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={`f-${f.name}`}>
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </Label>
                  <select
                    id={`f-${f.name}`}
                    value={String(val)}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  >
                    {(f.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {f.help && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.help}</p>}
                </div>
              );
            }
            if (f.type === "multiline") {
              return (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={`f-${f.name}`}>
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </Label>
                  <textarea
                    id={`f-${f.name}`}
                    value={String(val)}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full min-h-[120px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                  {f.help && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.help}</p>}
                </div>
              );
            }
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={`f-${f.name}`}>
                  {f.label} {f.required && <span className="text-red-400">*</span>}
                </Label>
                <Input
                  id={`f-${f.name}`}
                  type={f.type === "password" ? "password" : f.type === "number" ? "number" : "text"}
                  value={String(val)}
                  onChange={(e) => onChange(f.type === "number" ? Number(e.target.value) : e.target.value)}
                  placeholder={f.placeholder}
                />
                {f.help && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.help}</p>}
              </div>
            );
          })}

          {error && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] p-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onSubmit(name, values)} disabled={busy}>
            {busy ? "Connecting…" : spec.creates === "crawl_source" ? "Connect & crawl" : "Connect"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit-source dialog ────────────────────────────────────────────────────

const KEEP_SENTINEL = "__KEEP_EXISTING__";

type SourceConfigResp = {
  id: string;
  name: string;
  source_type: string;
  spec_kind: string;
  config: Record<string, unknown>;
};

function SourceEditDialog({
  open, source, specs, token, onClose, onSaved,
}: {
  open: boolean;
  source: CrawlSource | null;
  specs: ConnectorSpec[];
  token: string | undefined;
  onClose: () => void;
  onSaved: (updated: CrawlSource) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["crawler-source-config", source?.id],
    queryFn: () => apiFetch<SourceConfigResp>(`/crawler/sources/${source!.id}/config`, token),
    enabled: open && !!source && !!token,
    staleTime: 0,
  });

  const spec = useMemo(() => {
    if (!cfg) return null;
    return specs.find((s) => s.kind === cfg.spec_kind) ?? null;
  }, [cfg, specs]);

  useEffect(() => {
    if (!cfg) return;
    setName(cfg.name);
    setTouched(new Set());
    setError(null);
    const initial: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cfg.config || {})) {
      initial[k] = v;
    }
    setValues(initial);
  }, [cfg]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!source) throw new Error("No source selected");
      const payload: { name?: string; config?: Record<string, unknown> } = {};
      if (name.trim() && name.trim() !== source.name) payload.name = name.trim();
      const cfgPatch: Record<string, unknown> = {};
      Array.from(touched).forEach((key) => {
        cfgPatch[key] = values[key];
      });
      if (Object.keys(cfgPatch).length > 0) payload.config = cfgPatch;
      if (!payload.name && !payload.config) {
        return source;
      }
      return apiFetch<CrawlSource>(`/crawler/sources/${source.id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["crawler-sources"] });
      qc.invalidateQueries({ queryKey: ["crawler-source-config", source?.id] });
      setError(null);
      onSaved(updated);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Update failed"),
  });

  if (!open || !source) return null;

  const setField = (k: string, v: string | number) => {
    setValues((s) => ({ ...s, [k]: v }));
    setTouched((s) => {
      const n = new Set(s);
      n.add(k);
      return n;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[hsl(var(--border))] p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Edit source</p>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mt-0.5">
              {source.name}{" "}
              <span className="text-xs text-[hsl(var(--muted-foreground))]">({source.source_type})</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading || !cfg || !spec ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Display name</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {spec.fields.map((f) => {
                const raw = values[f.name];
                const isSecret = !!f.secret;
                const hasKept = isSecret && raw === KEEP_SENTINEL && !touched.has(f.name);
                const displayValue = hasKept ? "" : ((raw ?? "") as string | number);

                if (f.type === "select") {
                  return (
                    <div key={f.name} className="space-y-1.5">
                      <Label htmlFor={`edit-${f.name}`}>
                        {f.label} {f.required && <span className="text-red-400">*</span>}
                      </Label>
                      <select
                        id={`edit-${f.name}`}
                        value={String(displayValue)}
                        onChange={(e) => setField(f.name, e.target.value)}
                        className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
                      >
                        {(f.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {f.help && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.help}</p>}
                    </div>
                  );
                }
                if (f.type === "multiline") {
                  return (
                    <div key={f.name} className="space-y-1.5">
                      <Label htmlFor={`edit-${f.name}`}>
                        {f.label} {f.required && <span className="text-red-400">*</span>}
                      </Label>
                      <textarea
                        id={`edit-${f.name}`}
                        value={String(displayValue)}
                        onChange={(e) => setField(f.name, e.target.value)}
                        placeholder={hasKept ? "•••• (keep existing — leave blank to keep)" : f.placeholder}
                        className="w-full min-h-[120px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-xs font-mono"
                      />
                      {f.help && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.help}</p>}
                    </div>
                  );
                }
                return (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={`edit-${f.name}`}>
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </Label>
                    <Input
                      id={`edit-${f.name}`}
                      type={f.type === "password" ? "password" : f.type === "number" ? "number" : "text"}
                      value={String(displayValue)}
                      onChange={(e) => setField(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}
                      placeholder={hasKept ? "•••• (leave blank to keep existing)" : f.placeholder}
                    />
                    {f.help && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.help}</p>}
                  </div>
                );
              })}

              {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2 whitespace-pre-line">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] p-4">
          <Button variant="outline" onClick={onClose} disabled={saveMut.isPending}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || isLoading}>
            {saveMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Recursive source-tree renderer ────────────────────────────────────────

function SourceTree({
  sources, parentId, depth, onSelect, selectedId, onStartCrawl, onEdit, onDelete, busyStart, busyDelete,
}: {
  sources: CrawlSource[];
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  onSelect: (s: CrawlSource) => void;
  onStartCrawl: (s: CrawlSource) => void;
  onEdit: (s: CrawlSource) => void;
  onDelete: (s: CrawlSource) => void;
  busyStart: boolean;
  busyDelete: boolean;
}) {
  const items = sources.filter((s) => (s.parent_crawl_source_id ?? null) === parentId);
  if (items.length === 0) return null;
  return (
    <ul className={cn("space-y-2", depth > 0 && "mt-2")}>
      {items.map((s) => {
        const isSelected = selectedId === s.id;
        return (
          <li key={s.id}>
            <div
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-[hsl(var(--primary))]/60 bg-[hsl(var(--primary))]/5"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/40",
              )}
              style={{ marginLeft: depth * 20 }}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => onSelect(s)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {depth > 0 && (
                      <span className="text-[hsl(var(--muted-foreground))]">↳</span>
                    )}
                    <p className="font-semibold text-[hsl(var(--foreground))] truncate">
                      {s.name}
                    </p>
                    <TypeBadge type={s.source_type} />
                    <StatusBadge status={s.status} />
                  </div>
                  {s.last_crawled_at && (
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                      Last crawl {new Date(s.last_crawled_at).toLocaleString()}
                    </p>
                  )}
                </button>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => onStartCrawl(s)}
                    disabled={busyStart || s.status === "CRAWLING"}
                  >
                    {s.status === "CRAWLING" ? "Crawling…" : "Start crawl"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onSelect(s)}>
                    Pipeline
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(s)}
                    disabled={s.status === "CRAWLING"}
                    title={s.status === "CRAWLING" ? "Wait for the crawl to finish before editing" : "Edit source"}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(s)}
                    disabled={busyDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
            <SourceTree
              sources={sources}
              parentId={s.id}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onStartCrawl={onStartCrawl}
              onEdit={onEdit}
              onDelete={onDelete}
              busyStart={busyStart}
              busyDelete={busyDelete}
            />
          </li>
        );
      })}
    </ul>
  );
}

// ─── Code lineage graph (compact) ──────────────────────────────────────────

const SYMBOL_NODE_TYPES = new Set([
  "MODULE", "CLASS", "FUNCTION", "METHOD", "EXTERNAL", "INTERFACE", "TRAIT", "ENUM",
]);

function LineageGraph({ nodes }: { nodes: CodeLineageNodeOut[] }) {
  // Hide symbol-graph nodes from this compact data-lineage view — they live in
  // the dedicated "Code symbol graph" tab.
  const dataNodes = nodes.filter((n) => !SYMBOL_NODE_TYPES.has(n.node_type));
  if (dataNodes.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">
        No table-level lineage in this source yet (or only symbol-level code). SQL / dbt / Spark / pandas produce nodes here — for{" "}
        <strong>functions &amp; classes</strong>, open{" "}
        <a href="/lineage?tab=code" className="underline text-[hsl(var(--primary))]">
          Lineage → Code structure
        </a>
        .
      </p>
    );
  }
  const childMap = new Map<string, CodeLineageNodeOut[]>();
  dataNodes.forEach((n) => {
    if (n.parent_node_id) {
      const arr = childMap.get(n.parent_node_id) || [];
      arr.push(n);
      childMap.set(n.parent_node_id, arr);
    }
  });
  return (
    <div className="space-y-1 text-xs font-mono max-h-64 overflow-y-auto">
      {dataNodes.filter((n) => !n.parent_node_id).slice(0, 50).map((n) => (
        <LineageNodeRow key={n.id} node={n} childMap={childMap} depth={0} />
      ))}
    </div>
  );
}

function SourceDataLineageCard({
  sourceId,
  token,
  nodes,
}: {
  sourceId: string;
  token: string | undefined;
  nodes: CodeLineageNodeOut[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data lineage for this crawl source</CardTitle>
        <CardDescription>
          Table-level reads/writes detected from SQL, dbt, pandas, Spark, and similar. This is separate from the{" "}
          <strong>call graph</strong> (functions / classes) — open{" "}
          <a
            href={`/lineage?tab=code&source=${encodeURIComponent(sourceId)}`}
            className="underline decoration-dotted text-[hsl(var(--primary))]"
          >
            Lineage → Code structure
          </a>{" "}
          for an interactive tree-sitter graph. Workspace-wide <strong>data flow</strong> is on{" "}
          <a href="/lineage" className="underline decoration-dotted text-[hsl(var(--primary))]">
            Lineage → Unified data graph
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
          Prefer the dedicated page for the large code graph — this keeps the crawler focused on setup and pipeline status.
        </p>
        <LineageGraph nodes={nodes} />
      </CardContent>
    </Card>
  );
}

function LineageNodeRow({
  node, childMap, depth,
}: {
  node: CodeLineageNodeOut;
  childMap: Map<string, CodeLineageNodeOut[]>;
  depth: number;
}) {
  const children = childMap.get(node.id) || [];
  return (
    <div>
      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 14 }}>
        <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
        <span className="text-[hsl(var(--foreground))] truncate">{node.node_name}</span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">
          {node.node_type}
        </span>
        {node.environment && node.environment !== "UNKNOWN" && (
          <span className="text-[10px] text-emerald-400">{node.environment}</span>
        )}
      </div>
      {children.slice(0, 20).map((c) => (
        <LineageNodeRow key={c.id} node={c} childMap={childMap} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Discoveries panel (grouped + bulk-skip) ───────────────────────────────

function hostOf(uri: string): string {
  try {
    const u = new URL(uri);
    return u.hostname || "(other)";
  } catch {
    const m = uri.match(/^[a-zA-Z][\w+.-]*:\/\/([^/?#]+)/);
    if (m) return m[1];
    return "(other)";
  }
}

type DiscoveryGroup = {
  key: string;
  host: string;
  kind: string;
  items: DiscoveredResource[];
  pendingCount: number;
};

function groupDiscoveries(rows: DiscoveredResource[]): DiscoveryGroup[] {
  const map = new Map<string, DiscoveryGroup>();
  for (const r of rows) {
    const host = hostOf(r.uri);
    const key = `${r.kind}|${host}`;
    let g = map.get(key);
    if (!g) {
      g = { key, host, kind: r.kind, items: [], pendingCount: 0 };
      map.set(key, g);
    }
    g.items.push(r);
    if (r.status === "PENDING_AUTH") g.pendingCount += 1;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
    return b.items.length - a.items.length;
  });
}

function DiscoveriesPanel({
  discoveries, specs, source, onConnect, onSkip, onSkipAll, bulkBusy,
}: {
  discoveries: DiscoveredResource[];
  specs: ConnectorSpec[];
  source: CrawlSource;
  onConnect: (id: string) => void;
  onSkip: (id: string) => void;
  onSkipAll: (kind?: string, host?: string) => void;
  bulkBusy: boolean;
}) {
  const [showResolved, setShowResolved] = useState(false);
  const [filter, setFilter] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const pendingCount = discoveries.filter((d) => d.status === "PENDING_AUTH").length;

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return discoveries.filter((d) => {
      if (!showResolved && d.status !== "PENDING_AUTH") return false;
      if (!f) return true;
      return (
        d.uri.toLowerCase().includes(f) ||
        (d.display_name || "").toLowerCase().includes(f) ||
        d.kind.toLowerCase().includes(f)
      );
    });
  }, [discoveries, showResolved, filter]);

  const groups = useMemo(() => groupDiscoveries(visible), [visible]);

  const toggleGroup = (key: string) =>
    setOpenGroups((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4" />
              Discovered resources ({pendingCount} pending)
            </CardTitle>
            <CardDescription>
              External systems referenced in the code. Connect to keep the lineage chain going,
              or skip the ones that aren&apos;t real data sources (package registries, CDNs, docs…).
            </CardDescription>
          </div>
          {pendingCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => {
                if (window.confirm(`Skip all ${pendingCount} pending discoveries for "${source.name}"?`)) {
                  onSkipAll();
                }
              }}
            >
              {bulkBusy ? "Skipping…" : `Skip all ${pendingCount} pending`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {discoveries.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No external resources discovered yet.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by host, URI, kind…"
                className="h-9 max-w-xs"
              />
              <label className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                />
                Show skipped / connected
              </label>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No matches.
              </p>
            ) : (
              <ul className="space-y-2">
                {groups.map((g) => {
                  const spec = specs.find((s) => s.kind === g.kind);
                  const Icon = spec ? categoryIcon[spec.category] : HelpCircle;
                  const isOpen = openGroups.has(g.key) || g.items.length <= 2;
                  const showHeader = g.items.length > 1;
                  if (!showHeader) {
                    const d = g.items[0];
                    return (
                      <DiscoveryRow
                        key={d.id}
                        d={d}
                        Icon={Icon}
                        onConnect={onConnect}
                        onSkip={onSkip}
                      />
                    );
                  }
                  return (
                    <li
                      key={g.key}
                      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(g.key)}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[hsl(var(--muted))]/20"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                        )}
                        <Icon className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold truncate">{g.host}</p>
                            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                              {g.kind}
                            </span>
                            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                              {g.items.length} ref{g.items.length === 1 ? "" : "s"}
                              {g.pendingCount > 0 && ` • ${g.pendingCount} pending`}
                            </span>
                          </div>
                        </div>
                        {g.pendingCount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={bulkBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSkipAll(g.kind, g.host);
                            }}
                          >
                            Skip group
                          </Button>
                        )}
                      </button>
                      {isOpen && (
                        <ul className="border-t border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                          {g.items.slice(0, 50).map((d) => (
                            <DiscoveryRow
                              key={d.id}
                              d={d}
                              Icon={Icon}
                              onConnect={onConnect}
                              onSkip={onSkip}
                              compact
                            />
                          ))}
                          {g.items.length > 50 && (
                            <li className="p-2 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
                              … {g.items.length - 50} more (use Skip group)
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DiscoveryRow({
  d, Icon, onConnect, onSkip, compact,
}: {
  d: DiscoveredResource;
  Icon: React.ComponentType<{ className?: string }>;
  onConnect: (id: string) => void;
  onSkip: (id: string) => void;
  compact?: boolean;
}) {
  const isResolved = d.status !== "PENDING_AUTH";
  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-3",
        compact
          ? cn("px-3 py-2", isResolved && "opacity-60")
          : cn(
              "rounded-lg border p-3",
              isResolved
                ? "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 opacity-70"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))]",
            ),
      )}
    >
      {!compact && <Icon className="w-4 h-4 mt-0.5 text-[hsl(var(--primary))] shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-[hsl(var(--foreground))] truncate text-sm">
            {d.display_name}
          </p>
          {!compact && (
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {d.kind}
            </span>
          )}
          <StatusBadge status={d.status} />
        </div>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 font-mono break-all">
          {d.uri}
        </p>
        {d.source_file && (
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            from <span className="font-mono">{d.source_file}</span>
          </p>
        )}
      </div>
      {!isResolved && (
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => onConnect(d.id)}>Connect</Button>
          <Button size="sm" variant="outline" onClick={() => onSkip(d.id)}>Skip</Button>
        </div>
      )}
    </li>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function CrawlerPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const qc = useQueryClient();

  // Add source form
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<(typeof SOURCE_TYPE_OPTIONS)[number]>("GITHUB");
  const [repoUrl, setRepoUrl] = useState("");
  const [pat, setPat] = useState("");
  const [branch, setBranch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Selection / dialog state
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [dialogDiscoveryId, setDialogDiscoveryId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: sources = [] } = useQuery({
    queryKey: ["crawler-sources"],
    queryFn: () => apiFetch<CrawlSource[]>("/crawler/sources", token),
    enabled: !!token,
    refetchInterval: (q) => {
      const list = (q.state.data as CrawlSource[]) || [];
      return list.some((s) => s.status === "CRAWLING") ? 2500 : false;
    },
  });

  const { data: specsResp } = useQuery({
    queryKey: ["crawler-specs"],
    queryFn: () => apiFetch<SpecsResp>("/crawler/connector-specs", token),
    enabled: !!token,
    staleTime: 60_000,
  });
  const specs = useMemo(() => specsResp?.specs ?? [], [specsResp]);

  const selected = useMemo(
    () => sources.find((s) => s.id === selectedSourceId) ?? null,
    [sources, selectedSourceId],
  );

  const isActiveSelected = !!selected && (selected.status === "CRAWLING" || selected.status === "PENDING_AUTH");

  const { data: sessions = [] } = useQuery({
    queryKey: ["crawler-sessions", selectedSourceId],
    queryFn: () => apiFetch<CrawlSession[]>(`/crawler/sources/${selectedSourceId}/sessions`, token),
    enabled: !!token && !!selectedSourceId,
    refetchInterval: isActiveSelected ? 2000 : false,
  });
  const latestSession = sessions[0];

  const { data: discoveries = [] } = useQuery({
    queryKey: ["crawler-discoveries", selectedSourceId],
    queryFn: () => apiFetch<DiscoveredResource[]>(`/crawler/sources/${selectedSourceId}/discoveries`, token),
    enabled: !!token && !!selectedSourceId,
    refetchInterval: isActiveSelected ? 2500 : false,
  });

  const { data: lineageNodes = [] } = useQuery({
    queryKey: ["crawler-lineage", selectedSourceId],
    queryFn: () => apiFetch<CodeLineageNodeOut[]>(`/crawler/sources/${selectedSourceId}/lineage`, token),
    enabled: !!token && !!selectedSourceId,
    refetchInterval: isActiveSelected ? 3000 : false,
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: async () => {
      if (!repoUrl.trim()) throw new Error("Repository URL is required");
      const config: Record<string, unknown> = { url: repoUrl.trim() };
      if (pat.trim()) config.token = pat.trim();
      if (branch.trim()) config.branch = branch.trim();
      return apiFetch<CrawlSource>("/crawler/sources", token, {
        method: "POST",
        body: JSON.stringify({ name: sourceName.trim(), source_type: sourceType, config }),
      });
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["crawler-sources"] });
      setSourceName(""); setRepoUrl(""); setPat(""); setBranch("");
      setFormError(null);
      setSelectedSourceId(s.id);
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : "Failed to create source"),
  });

  const startCrawlMut = useMutation({
    mutationFn: (s: CrawlSource) =>
      apiFetch<{ message?: string }>(`/crawler/sources/${s.id}/crawl`, token, { method: "POST" }),
    onMutate: (s) => setSelectedSourceId(s.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crawler-sources"] });
      qc.invalidateQueries({ queryKey: ["crawler-sessions", selectedSourceId] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (s: CrawlSource) =>
      apiFetch<unknown>(`/crawler/sources/${s.id}`, token, { method: "DELETE" }),
    onSuccess: (_d, s) => {
      qc.invalidateQueries({ queryKey: ["crawler-sources"] });
      if (selectedSourceId === s.id) setSelectedSourceId(null);
    },
  });

  const connectMut = useMutation({
    mutationFn: ({ id, name, credentials }: { id: string; name: string; credentials: Record<string, unknown> }) =>
      apiFetch<{ child_crawl_source_id?: string; sub_crawl_started?: boolean }>(
        `/crawler/discoveries/${id}/connect`,
        token,
        { method: "POST", body: JSON.stringify({ name, credentials, start_crawl: true }) },
      ),
    onSuccess: (d) => {
      setDialogDiscoveryId(null);
      setDialogError(null);
      qc.invalidateQueries({ queryKey: ["crawler-sources"] });
      qc.invalidateQueries({ queryKey: ["crawler-discoveries", selectedSourceId] });
      if (d.child_crawl_source_id) setSelectedSourceId(d.child_crawl_source_id);
    },
    onError: (e) => setDialogError(e instanceof Error ? e.message : "Connect failed"),
  });

  const skipMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/crawler/discoveries/${id}/skip`, token, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crawler-discoveries", selectedSourceId] }),
  });

  const skipAllMut = useMutation({
    mutationFn: ({ sourceId, kind, host }: { sourceId: string; kind?: string; host?: string }) => {
      const params = new URLSearchParams();
      if (kind) params.set("kind", kind);
      if (host) params.set("host", host);
      const qs = params.toString();
      return apiFetch<{ skipped: number; pending_remaining: number }>(
        `/crawler/sources/${sourceId}/discoveries/skip-all${qs ? `?${qs}` : ""}`,
        token,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crawler-discoveries", selectedSourceId] });
      qc.invalidateQueries({ queryKey: ["crawler-sources"] });
    },
  });

  // ── Derived ────────────────────────────────────────────────────────────
  const dialogDiscovery = discoveries.find((d) => d.id === dialogDiscoveryId) ?? null;
  const dialogSpec = dialogDiscovery ? specs.find((s) => s.kind === dialogDiscovery.kind) ?? null : null;

  const submitForm = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!sourceName.trim()) {
        setFormError("Source name is required");
        return;
      }
      if (!repoUrl.trim()) {
        setFormError("Repository URL is required");
        return;
      }
      createMut.mutate();
    },
    [sourceName, repoUrl, createMut],
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl">
      <header>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold tracking-tight">Data Crawler</h1>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1.5 max-w-3xl leading-relaxed">
          Crawl a code repository to build end-to-end lineage. As we find external resources
          (databases, APIs, other Git repos, dbt profiles, Airflow connections…), we&apos;ll prompt
          you for credentials — connect them and we&apos;ll keep crawling recursively.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* LEFT: Add source + tree */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add a starting source</CardTitle>
              <CardDescription>
                Begin from any Git repository. We&apos;ll discover the rest from inside.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitForm} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="src-name">Source name</Label>
                    <Input id="src-name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. analytics-platform" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="src-type">Provider</Label>
                    <select
                      id="src-type"
                      className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value as typeof SOURCE_TYPE_OPTIONS[number])}
                    >
                      {SOURCE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="src-url">Repository URL</Label>
                  <Input id="src-url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/pankaj779/JARVIS-AI" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="src-pat">Personal access token (required for private repos)</Label>
                    <Input id="src-pat" type="password" value={pat} onChange={(e) => setPat(e.target.value)} placeholder="ghp_… / glpat_… / bbp_…" />
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                      Token must be from the <b>same GitHub account</b> that has access to the repo.{" "}
                      Classic PAT needs <code className="text-[11px] px-1 bg-[hsl(var(--muted))]/40 rounded">repo</code> scope;{" "}
                      fine-grained PAT needs <code className="text-[11px] px-1 bg-[hsl(var(--muted))]/40 rounded">Contents: Read</code>{" "}
                      and the repo selected.{" "}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-dotted text-[hsl(var(--primary))]"
                      >
                        Create a token →
                      </a>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="src-branch">Branch (optional)</Label>
                    <Input id="src-branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
                  </div>
                </div>
                {formError && <p className="text-sm text-red-300">{formError}</p>}
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Adding…" : "Add source"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
              Crawl tree
            </h2>
            {sources.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No sources yet.</p>
            ) : (
              <SourceTree
                sources={sources}
                parentId={null}
                depth={0}
                selectedId={selectedSourceId}
                onSelect={(s) => setSelectedSourceId(s.id)}
                onStartCrawl={(s) => startCrawlMut.mutate(s)}
                onEdit={(s) => setEditSourceId(s.id)}
                onDelete={(s) => deleteMut.mutate(s)}
                busyStart={startCrawlMut.isPending}
                busyDelete={deleteMut.isPending}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Live pipeline + discoveries + lineage */}
        <div className="space-y-6">
          {!selected ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Select a source on the left to see its live pipeline, discoveries, and lineage.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{selected.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1.5">
                        <TypeBadge type={selected.source_type} />
                        <StatusBadge status={selected.status} />
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => startCrawlMut.mutate(selected)}
                      disabled={startCrawlMut.isPending || selected.status === "CRAWLING"}
                    >
                      {selected.status === "CRAWLING" ? "Crawling…" : "Start crawl"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {latestSession ? (
                    <div className="space-y-4">
                      <PipelineTimeline steps={latestSession.pipeline_steps} />
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <Stat label="Files scanned" value={latestSession.files_scanned} />
                        <Stat label="Lineage edges" value={latestSession.edges_found} />
                        <Stat label="Discoveries" value={latestSession.discoveries_found} highlight={latestSession.discoveries_found > 0} />
                      </div>
                      {latestSession.error_message && (
                        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-3 break-words whitespace-pre-line leading-relaxed">
                          {latestSession.error_message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      No crawl runs yet. Click <strong>Start crawl</strong> to begin.
                    </p>
                  )}
                </CardContent>
              </Card>

              <DiscoveriesPanel
                discoveries={discoveries}
                specs={specs}
                source={selected}
                onConnect={(id) => { setDialogError(null); setDialogDiscoveryId(id); }}
                onSkip={(id) => skipMut.mutate(id)}
                onSkipAll={(kind, host) => skipAllMut.mutate({ sourceId: selected.id, kind, host })}
                bulkBusy={skipAllMut.isPending}
              />

              <SourceDataLineageCard
                sourceId={selected.id}
                token={token}
                nodes={lineageNodes}
              />
            </>
          )}
        </div>
      </div>

      <DiscoveryConnectDialog
        open={!!dialogDiscoveryId}
        onClose={() => { setDialogDiscoveryId(null); setDialogError(null); }}
        discovery={dialogDiscovery}
        spec={dialogSpec}
        onSubmit={(name, credentials) => {
          if (!dialogDiscoveryId) return;
          connectMut.mutate({ id: dialogDiscoveryId, name, credentials });
        }}
        busy={connectMut.isPending}
        error={dialogError}
      />

      <SourceEditDialog
        open={!!editSourceId}
        source={sources.find((s) => s.id === editSourceId) ?? null}
        specs={specs}
        token={token}
        onClose={() => setEditSourceId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["crawler-sources"] });
        }}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-center",
        highlight
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20",
      )}
    >
      <p className={cn("text-2xl font-bold tabular-nums", highlight ? "text-amber-300" : "text-[hsl(var(--foreground))]")}>
        {value.toLocaleString()}
      </p>
      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{label}</p>
    </div>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";

import { ResultChart } from "@/components/result-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

type Conn = { id: string; name: string; type: string };
type Hist = {
  id: string;
  connection_id: string;
  conversation_id?: string | null;
  question: string;
  sql_text: string;
  created_at: string;
  chart_type: string | null;
  result_row_count: number;
  confidence_score?: number | null;
  explanation?: string | null;
};

type HistorySession = {
  key: string;
  conversationId: string | null;
  label: string;
  turnCount: number;
  startedAt: string;
  items: Hist[];
  isCurrent: boolean;
};

function newConversationId(): string {
  return crypto.randomUUID();
}

function groupHistorySessions(items: Hist[], currentConversationId: string | null): HistorySession[] {
  const convMap = new Map<string, Hist[]>();
  const legacy: Hist[] = [];

  for (const h of items) {
    if (!h.conversation_id) legacy.push(h);
    else {
      const arr = convMap.get(h.conversation_id) || [];
      arr.push(h);
      convMap.set(h.conversation_id, arr);
    }
  }

  const sessions: HistorySession[] = [];
  for (const [cid, list] of convMap) {
    const oldest = list[list.length - 1];
    sessions.push({
      key: cid,
      conversationId: cid,
      label: oldest?.question || "Conversation",
      turnCount: list.length,
      startedAt: oldest?.created_at || list[0].created_at,
      items: list,
      isCurrent: cid === currentConversationId,
    });
  }
  sessions.sort(
    (a, b) => new Date(b.items[0].created_at).getTime() - new Date(a.items[0].created_at).getTime()
  );

  if (legacy.length) {
    sessions.push({
      key: "__legacy__",
      conversationId: null,
      label: "Earlier (ungrouped)",
      turnCount: legacy.length,
      startedAt: legacy[legacy.length - 1].created_at,
      items: legacy,
      isCurrent: false,
    });
  }
  return sessions;
}

function isChatHistoryEntry(h: Hist): boolean {
  const sql = (h.sql_text || "").trim();
  return sql.startsWith("-- chat:") || h.chart_type === "answer";
}

function isRunnableSql(sql: string): boolean {
  const s = sql.trim();
  if (!s || s.startsWith("--")) return false;
  const first = s.split(/\s+/)[0]?.toUpperCase();
  return ["SELECT", "WITH", "SHOW", "DESCRIBE", "DESC", "EXPLAIN"].includes(first || "");
}

type ChatMode = "auto" | "chat" | "query";

type GenRes = {
  response_mode?: "answer" | "sql" | "catalog";
  answer?: string | null;
  suggested_followups?: string[] | null;
  sql?: string | null;
  clarification_needed?: boolean;
  message?: string | null;
  explanation?: string | null;
  confidence?: number | null;
  validation_errors?: { code?: string; message?: string; detail?: string | null }[] | null;
  retry_attempts?: number;
};

type ExecRes = {
  columns: string[];
  rows: Record<string, unknown>[];
  chart_type: string;
  row_count: number;
  sql: string;
  explanation?: string | null;
  insight?: string | null;
  confidence?: number | null;
  metadata_version_id?: string | null;
};

const CHART_TYPES = ["auto", "bar", "line", "doughnut", "pivot", "table", "kpi"] as const;
type ChartPref = (typeof CHART_TYPES)[number];

function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function chartFeasible(type: ChartPref, cols: string[], rows: Record<string, unknown>[]): string | null {
  if (type === "auto" || type === "table") return null;
  if (!rows.length) return "No rows to chart.";
  if (type === "kpi" && rows.length !== 1) return "KPI requires exactly 1 row. Showing as table instead.";
  if (type === "kpi" && cols.length > 3) return "KPI works best with 1–3 columns. Showing first 3.";
  if ((type === "bar" || type === "line" || type === "doughnut") && cols.length < 2)
    return `${type} chart needs at least 2 columns (label + value). Showing as table.`;
  if (type === "pivot" && cols.length < 3) return "Pivot needs at least 3 columns (row, column, value). Showing as table.";
  if (type === "doughnut" && rows.length > 20) return "Too many rows for doughnut. Showing as bar instead.";
  return null;
}

function downloadCsv(columns: string[], rows: Record<string, unknown>[], filename: string) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(escape).join(",")];
  for (const r of rows) lines.push(columns.map((c) => escape(r[c])).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ChatPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [connectionId, setConnectionId] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("auto");
  const [input, setInput] = useState("");
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [sql, setSql] = useState<string | null>(null);
  const [editableSql, setEditableSql] = useState<string>("");
  const [sqlEdited, setSqlEdited] = useState(false);
  const [genMeta, setGenMeta] = useState<{
    confidence?: number | null;
    retries?: number;
    explanation?: string | null;
    validationErrors?: GenRes["validation_errors"];
  } | null>(null);
  const [exec, setExec] = useState<ExecRes | null>(null);
  const [chartPref, setChartPref] = useState<ChartPref>("auto");
  const [liveChart, setLiveChart] = useState<ChartPref>("auto");
  const [chartWarning, setChartWarning] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [copied, setCopied] = useState(false);
  const [conversationId, setConversationId] = useState(() => newConversationId());
  const [conversationHistory, setConversationHistory] = useState<
    { role: string; question?: string; sql?: string; summary?: string }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(() => new Set());
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const sqlRef = useRef<HTMLTextAreaElement>(null);
  const viewer = session?.user?.role === "VIEWER";

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("dw-history-open") === "0") {
      setHistoryOpen(false);
    }
  }, []);

  useEffect(() => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (conversationId) next.add(conversationId);
      return next;
    });
  }, [conversationId]);

  const toggleHistoryPanel = useCallback(() => {
    setHistoryOpen((open) => {
      const next = !open;
      localStorage.setItem("dw-history-open", next ? "1" : "0");
      return next;
    });
  }, []);

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => apiFetch<Conn[]>("/connections", token),
    enabled: !!token,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", connectionId],
    queryFn: () =>
      apiFetch<Hist[]>(connectionId ? `/history?connection_id=${connectionId}&limit=50` : "/history?limit=50", token),
    enabled: !!token,
  });

  const selectedConn = useMemo(() => connections.find((c) => c.id === connectionId), [connections, connectionId]);

  const historySessions = useMemo(
    () => groupHistorySessions(history, conversationId),
    [history, conversationId]
  );

  const runSQL = useCallback(
    async (sqlText: string, question: string, skipValidation: boolean) => {
      if (!connectionId || !sqlText.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const pref = (exec ? liveChart : chartPref);
        const run = await apiFetch<ExecRes>("/execute", token, {
          method: "POST",
          body: JSON.stringify({
            connection_id: connectionId,
            conversation_id: conversationId,
            sql: sqlText.trim(),
            question,
            chart_preference: pref === "auto" ? null : pref,
            skip_validation: skipValidation,
          }),
        });
        setExec(run);
        setLiveChart(run.chart_type as ChartPref);
        setChartWarning(null);
        setGenMeta((prev) => prev ? { ...prev, validationErrors: undefined } : prev);
        await qc.invalidateQueries({ queryKey: ["history", connectionId] });
        await qc.invalidateQueries({ queryKey: ["usage"] });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [connectionId, conversationId, chartPref, liveChart, exec, token, qc]
  );

  async function onSend() {
    if (!connectionId || !input.trim() || viewer) return;
    const q = input.trim();
    setLastQuestion(q);
    setLoading(true);
    setError(null);
    setClarification(null);
    setExec(null);
    setGenMeta(null);
    setChatAnswer(null);
    setFollowups([]);
    setChartWarning(null);
    setCopied(false);
    setSqlEdited(false);
    try {
      const gen = await apiFetch<GenRes>("/ai/generate", token, {
        method: "POST",
        body: JSON.stringify({
          connection_id: connectionId,
          conversation_id: conversationId,
          question: q,
          chat_mode: chatMode,
          conversation_history: conversationHistory.slice(-6),
        }),
      });
      if (gen.clarification_needed) {
        setClarification(gen.message || "More detail needed.");
        setSql(gen.sql || null);
        setEditableSql(gen.sql || "");
        setGenMeta({
          confidence: gen.confidence ?? null,
          retries: gen.retry_attempts,
          explanation: null,
          validationErrors: gen.validation_errors,
        });
        setLoading(false);
        await qc.invalidateQueries({ queryKey: ["usage"] });
        return;
      }
      const mode = gen.response_mode || "sql";
      if (mode === "answer" || mode === "catalog") {
        setSql(null);
        setEditableSql("");
        setChatAnswer(gen.answer || gen.message || "No answer returned.");
        setFollowups(gen.suggested_followups || []);
        setGenMeta({
          confidence: gen.confidence ?? null,
          retries: gen.retry_attempts,
          explanation: null,
          validationErrors: undefined,
        });
        setInput("");
        setConversationHistory((prev) => [
          ...prev,
          { role: "user", question: q },
          { role: "assistant", summary: gen.answer ?? undefined },
        ]);
        await qc.invalidateQueries({ queryKey: ["history", connectionId] });
        return;
      }

      if (!gen.sql) throw new Error("No SQL returned");
      setChatAnswer(null);
      setFollowups([]);
      setSql(gen.sql);
      setEditableSql(gen.sql);
      setGenMeta({
        confidence: gen.confidence ?? null,
        retries: gen.retry_attempts,
        explanation: gen.explanation ?? null,
        validationErrors: gen.validation_errors,
      });
      setInput("");
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", question: q },
        { role: "assistant", sql: gen.sql ?? undefined, summary: gen.explanation ?? undefined },
      ]);
      await runSQL(gen.sql, q, false);
    } catch (e) {
      const msg = (e as Error).message;
      const isValidation =
        msg.includes("UNKNOWN_TABLE") || msg.includes("UNKNOWN_COLUMN") || msg.includes("INVALID_JOIN") ||
        msg.includes("SQL validation failed");
      if (isValidation) {
        let errors: GenRes["validation_errors"] = [{ code: "VALIDATION", message: msg }];
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.errors) errors = parsed.errors;
          else if (parsed?.message) errors = [{ code: "VALIDATION", message: parsed.message }];
        } catch { /* use raw msg */ }
        setGenMeta((prev) => ({ ...prev, validationErrors: errors }));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChartSwitch(newType: ChartPref) {
    setLiveChart(newType);
    if (exec) {
      const warn = chartFeasible(newType, exec.columns, exec.rows);
      setChartWarning(warn);
    }
  }

  function copySql() {
    const text = editableSql || sql || "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSqlEdit(value: string) {
    setEditableSql(value);
    setSqlEdited(value !== sql);
  }

  function startNewConversation() {
    setConversationId(newConversationId());
    setConversationHistory([]);
    setSql(null);
    setEditableSql("");
    setSqlEdited(false);
    setExec(null);
    setGenMeta(null);
    setChatAnswer(null);
    setFollowups([]);
    setError(null);
    setClarification(null);
    setChartWarning(null);
    setInput("");
    setActiveHistoryId(null);
  }

  const loadHistoryItem = useCallback(
    async (h: Hist) => {
      if (!token) return;
      setActiveHistoryId(h.id);
      setLastQuestion(h.question || "");
      setError(null);
      setClarification(null);
      setChartWarning(null);
      setCopied(false);
      setSqlEdited(false);
      setGenMeta({
        confidence: h.confidence_score ?? null,
        explanation: h.explanation ?? null,
        validationErrors: undefined,
      });

      if (isChatHistoryEntry(h)) {
        setChatAnswer(h.explanation || h.question || "No saved answer text.");
        setFollowups([]);
        setSql(null);
        setEditableSql("");
        setExec(null);
        return;
      }

      const sqlText = (h.sql_text || "").trim();
      if (!isRunnableSql(sqlText)) {
        setError("This history entry has no runnable SQL. Re-ask the question below.");
        setInput(h.question || "");
        return;
      }

      setChatAnswer(null);
      setFollowups([]);
      setSql(sqlText);
      setEditableSql(sqlText);
      if (h.chart_type && CHART_TYPES.includes(h.chart_type as ChartPref)) {
        setChartPref(h.chart_type as ChartPref);
        setLiveChart(h.chart_type as ChartPref);
      }
      if (!viewer) {
        await runSQL(sqlText, h.question || "History replay", true);
      }
    },
    [token, viewer, runSQL]
  );

  function toggleSessionExpand(key: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resumeSession(session: HistorySession) {
    if (session.conversationId) setConversationId(session.conversationId);
    const turns = [...session.items].reverse();
    const hist: { role: string; question?: string; sql?: string; summary?: string }[] = [];
    for (const h of turns) {
      hist.push({ role: "user", question: h.question });
      if (isChatHistoryEntry(h)) {
        hist.push({ role: "assistant", summary: h.explanation || undefined });
      } else {
        hist.push({
          role: "assistant",
          sql: h.sql_text,
          summary: h.explanation || undefined,
        });
      }
    }
    setConversationHistory(hist);
    setExpandedSessions((prev) => new Set(prev).add(session.key));
  }

  async function deleteHistoryItem(h: Hist, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token || viewer) return;
    if (!window.confirm("Remove this item from workspace history?")) return;
    try {
      await apiFetch<{ ok: boolean }>(`/history/${h.id}`, token, { method: "DELETE" });
      if (activeHistoryId === h.id) startNewConversation();
      await qc.invalidateQueries({ queryKey: ["history", connectionId] });
      await qc.invalidateQueries({ queryKey: ["history-all"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const effectiveChart = exec
    ? liveChart === "auto"
      ? exec.chart_type
      : liveChart
    : "table";

  const currentSql = editableSql || sql || "";

  return (
    <div className="flex min-h-[calc(100vh-0px)] relative">
      {!historyOpen && (
        <button
          type="button"
          onClick={toggleHistoryPanel}
          title="Show workspace history"
          className="absolute left-0 top-20 z-10 flex items-center gap-1 rounded-r-md border border-l-0 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-2 text-[10px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50 shadow-sm"
        >
          <PanelLeftOpen className="h-4 w-4" />
          History
        </button>
      )}

      {historyOpen && (
        <aside className="w-72 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))]/25 flex flex-col">
          <div className="flex items-center justify-between gap-2 p-4 pb-2 border-b border-[hsl(var(--border))]/50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Workspace history
            </h2>
            <button
              type="button"
              onClick={toggleHistoryPanel}
              title="Hide workspace history"
              className="p-1 rounded hover:bg-[hsl(var(--muted))]/60 text-[hsl(var(--muted-foreground))]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <p className="px-4 pb-2 text-[10px] text-[hsl(var(--muted-foreground))]">
            Grouped by conversation. Click a turn to replay; expand a session header to resume follow-ups.
          </p>
          <ul className="flex-1 overflow-auto px-3 pb-4 space-y-3 text-sm">
            {historySessions.length === 0 && (
              <li className="text-xs text-[hsl(var(--muted-foreground))] px-1 py-4">
                No history for this connection yet.
              </li>
            )}
            {historySessions.map((session) => {
              const expanded = expandedSessions.has(session.key);
              return (
                <li key={session.key}>
                  <div
                    className={`rounded-md border text-[10px] ${
                      session.isCurrent
                        ? "border-[hsl(var(--primary))]/45 bg-[hsl(var(--primary))]/8"
                        : "border-[hsl(var(--border))]/60"
                    }`}
                  >
                    <div className="flex items-start gap-1 p-2">
                      <button
                        type="button"
                        onClick={() => toggleSessionExpand(session.key)}
                        className="shrink-0 p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        title={expanded ? "Collapse" : "Expand"}
                      >
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => resumeSession(session)}
                        className="flex-1 text-left min-w-0"
                        title="Resume this conversation for follow-up questions"
                      >
                        <p className="line-clamp-2 font-medium text-[hsl(var(--foreground))] text-xs">
                          {session.label}
                        </p>
                        <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                          {session.turnCount} turn{session.turnCount !== 1 ? "s" : ""} ·{" "}
                          {new Date(session.startedAt).toLocaleString()}
                          {session.isCurrent && (
                            <span className="text-[hsl(var(--primary))]"> · Active</span>
                          )}
                        </p>
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <ul className="mt-1 ml-3 pl-2 border-l border-[hsl(var(--border))]/50 space-y-1">
                      {session.items.map((h, idx) => (
                        <li key={h.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => void loadHistoryItem(h)}
                            onKeyDown={(e) => e.key === "Enter" && void loadHistoryItem(h)}
                            className={`group rounded-md border p-2 cursor-pointer transition-colors ${
                              activeHistoryId === h.id
                                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10"
                                : "border-[hsl(var(--border))]/40 hover:bg-[hsl(var(--muted))]/35"
                            }`}
                          >
                            <div className="flex gap-2 items-start">
                              <span className="text-[9px] text-[hsl(var(--muted-foreground))] shrink-0 pt-0.5">
                                #{session.turnCount - idx}
                              </span>
                              <p className="line-clamp-2 flex-1 text-xs text-[hsl(var(--foreground))]">
                                {h.question || "(no question)"}
                              </p>
                              {!viewer && (
                                <button
                                  type="button"
                                  title="Delete from history"
                                  onClick={(e) => void deleteHistoryItem(h, e)}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      <div className="flex-1 flex flex-col p-6 gap-4 min-w-0">
        {viewer && (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm">
            View-only role: you can browse history and lineage but cannot run new queries.
          </div>
        )}

        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[220px] flex-1">
            <Label>Connection</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
              value={connectionId}
              onChange={(e) => { setConnectionId(e.target.value); startNewConversation(); }}
            >
              <option value="">Select…</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Chart style</Label>
            <select
              className="mt-1 flex h-10 w-40 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
              value={exec ? liveChart : chartPref}
              onChange={(e) => {
                const v = e.target.value as ChartPref;
                if (exec) {
                  handleChartSwitch(v);
                } else {
                  setChartPref(v);
                }
              }}
            >
              {CHART_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {conversationHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={startNewConversation} className="self-end">
              New conversation
            </Button>
          )}
        </div>

        {conversationHistory.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/60" />
            Conversation active — {Math.floor(conversationHistory.length / 2)} turn
            {Math.floor(conversationHistory.length / 2) !== 1 ? "s" : ""} in this session. Follow-ups use prior
            context. New conversation starts a separate thread in history.
          </div>
        )}

        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/40 p-4 flex flex-col min-h-[320px] overflow-auto">
          {clarification && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{clarification}</div>
          )}
          {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm whitespace-pre-wrap">{error}</div>}

          {/* Validation warnings with Run-anyway button */}
          {genMeta?.validationErrors && genMeta.validationErrors.length > 0 && !exec && sql && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-300 mb-1">Validator warning</p>
              {genMeta.validationErrors.map((ve, i) => (
                <p key={i} className="text-sm text-amber-200/80">
                  {ve.code}: {ve.message}
                </p>
              ))}
              <div className="mt-3 flex gap-2 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
                  disabled={loading}
                  onClick={() => void runSQL(currentSql, lastQuestion, true)}
                >
                  {loading ? "Running…" : "Run anyway (skip validation)"}
                </Button>
                <p className="text-[10px] text-amber-200/50">
                  Safety checks (read-only, no DML) are always enforced
                </p>
              </div>
            </div>
          )}

          {/* SQL Editor section */}
          {(sql || editableSql) && (
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                {genMeta?.confidence != null && <span>Model confidence: {pct(genMeta.confidence)}</span>}
                {genMeta?.retries != null && genMeta.retries > 1 && (
                  <span>Validator retries: {genMeta.retries - 1}</span>
                )}
              </div>
              {genMeta?.explanation && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] border-l-2 border-[hsl(var(--primary))]/50 pl-3">
                  {genMeta.explanation}
                </p>
              )}

              <div className="flex items-center gap-2">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {sqlEdited ? "SQL (edited)" : "Generated SQL"}
                </p>
                <button
                  onClick={copySql}
                  className="text-[10px] px-2 py-0.5 rounded border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/60 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                {sqlEdited && (
                  <button
                    onClick={() => { setEditableSql(sql || ""); setSqlEdited(false); }}
                    className="text-[10px] px-2 py-0.5 rounded border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/60 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              <textarea
                ref={sqlRef}
                value={editableSql}
                onChange={(e) => handleSqlEdit(e.target.value)}
                className="w-full text-xs font-mono bg-[hsl(var(--muted))]/40 text-[hsl(var(--foreground))] rounded-md p-3 border border-[hsl(var(--border))]/50 focus:border-[hsl(var(--primary))]/60 focus:outline-none resize-y min-h-[60px]"
                rows={Math.min(Math.max(editableSql.split("\n").length, 2), 10)}
                spellCheck={false}
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={loading || !currentSql.trim() || !connectionId || viewer}
                  onClick={() => void runSQL(currentSql, lastQuestion || "Manual run", true)}
                >
                  {loading ? "Running…" : "Run SQL"}
                </Button>
                {exec && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || !currentSql.trim() || !connectionId || viewer}
                    onClick={() => {
                      setExec(null);
                      void runSQL(currentSql, lastQuestion || "Re-run", true);
                    }}
                  >
                    Re-run
                  </Button>
                )}
              </div>
            </div>
          )}

          {exec && (
            <div className="space-y-4 flex-1 overflow-auto">
              <div className="flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))] items-center">
                {exec.confidence != null && <span>Run confidence: {pct(exec.confidence)}</span>}
                {exec.metadata_version_id && <span>Metadata version: {exec.metadata_version_id.slice(0, 8)}…</span>}
                <span>{exec.row_count} row{exec.row_count !== 1 ? "s" : ""}</span>
                {exec.columns.length > 0 && (
                  <button
                    onClick={() => downloadCsv(exec.columns, exec.rows, `query-${Date.now()}.csv`)}
                    className="px-2 py-0.5 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/60 transition-colors"
                  >
                    Download CSV
                  </button>
                )}
              </div>

              {chartWarning && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                  {chartWarning}
                </div>
              )}

              {exec.insight && (
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-emerald-400/90 mb-1">Insight</p>
                  {exec.insight}
                </div>
              )}
              {exec.explanation && <p className="text-sm text-[hsl(var(--muted-foreground))]">{exec.explanation}</p>}

              <ResultChart chartType={effectiveChart} columns={exec.columns} rows={exec.rows} />

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      {exec.columns.map((c) => (
                        <th key={c} className="text-left p-2 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exec.rows.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-b border-[hsl(var(--border))]/50">
                        {exec.columns.map((c) => (
                          <td key={c} className="p-2 align-top">
                            {r[c] === null || r[c] === undefined ? "" : String(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {exec.rows.length > 200 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] p-2">
                    Showing 200 of {exec.rows.length} rows
                  </p>
                )}
              </div>
            </div>
          )}

          {chatAnswer && !sql && (
            <div className="space-y-4 flex-1">
              <div className="rounded-lg border border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/5 p-4">
                <p className="text-xs uppercase tracking-wide text-[hsl(var(--primary))] mb-2">
                  {chatMode === "chat" ? "Answer" : "Data overview"}
                </p>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{chatAnswer}</div>
              </div>
              {genMeta?.confidence != null && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Model confidence: {pct(genMeta.confidence)}
                </p>
              )}
              {followups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Try next:</p>
                  <div className="flex flex-wrap gap-2">
                    {followups.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setInput(f);
                          setChatMode("query");
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!exec && !sql && !editableSql && !error && !clarification && !chatAnswer && (
            <p className="text-[hsl(var(--muted-foreground))] text-sm m-auto text-center max-w-md">
              {selectedConn
                ? "Ask about your data in plain English. Use Auto to let DataWhisper choose chat vs query, or pick a mode below."
                : "Pick a connection first."}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[hsl(var(--muted-foreground))] mr-1">Mode:</span>
            {(
              [
                ["auto", "Auto", "Smart routing — overview vs query"],
                ["chat", "Chat", "Explain & describe — no SQL/charts"],
                ["query", "Query", "Always run SQL and show data"],
              ] as const
            ).map(([id, label, title]) => (
              <button
                key={id}
                type="button"
                title={title}
                disabled={viewer}
                onClick={() => setChatMode(id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  chatMode === id
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15 text-[hsl(var(--foreground))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              placeholder={
                chatMode === "chat"
                  ? "e.g. What data do we have? Describe the tables."
                  : chatMode === "query"
                    ? "e.g. Show 10 rows from agentops_test_payload"
                    : "e.g. Give me an overview of the data · or Show revenue by region"
              }
              value={input}
              disabled={viewer}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void onSend())}
              className="flex-1 min-w-[200px]"
            />
            <Button onClick={() => void onSend()} disabled={loading || !connectionId || viewer}>
              {loading ? "Thinking…" : chatMode === "query" ? "Run query" : "Ask"}
            </Button>
            {exec && sql && !viewer && (
              <Button variant="outline" size="sm" type="button" onClick={() => setSaveOpen(true)}>
                Save report
              </Button>
            )}
          </div>
          {saveOpen && (
            <div className="flex gap-2 items-end flex-wrap border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted))]/20">
              <div className="flex-1 min-w-[180px]">
                <Label>Report name</Label>
                <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="My weekly revenue" />
              </div>
              <Button
                type="button"
                onClick={async () => {
                  if (!saveName.trim() || !connectionId || !currentSql) return;
                  try {
                    await apiFetch("/reports", token, {
                      method: "POST",
                      body: JSON.stringify({
                        name: saveName.trim(),
                        connection_id: connectionId,
                        sql_text: currentSql,
                        question: lastQuestion || "Saved from chat",
                        chart_type_hint: liveChart === "auto" ? null : liveChart,
                        shared_with_workspace: false,
                      }),
                    });
                    setSaveOpen(false);
                    setSaveName("");
                    await qc.invalidateQueries({ queryKey: ["reports"] });
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Save
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

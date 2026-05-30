"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultChart } from "@/components/result-chart";
import { apiFetch } from "@/lib/api";

type Report = {
  id: string;
  name: string;
  question: string;
  sql_text: string;
  connection_id: string;
  chart_type_hint: string | null;
  shared_with_workspace: boolean;
};

type ExecResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  chart_type: string;
  row_count: number;
  sql: string;
  explanation?: string;
  insight?: string;
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const viewer = session?.user?.role === "VIEWER";
  const qc = useQueryClient();
  const [cron, setCron] = useState("0 9 * * *");
  const [email, setEmail] = useState("");
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<Record<string, ExecResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<Record<string, string>>({});

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiFetch<Report[]>("/reports", token),
    enabled: !!token && !viewer,
  });

  async function handleRun(reportId: string) {
    setRunningId(reportId);
    setRunError((prev) => ({ ...prev, [reportId]: "" }));
    try {
      const result = await apiFetch<ExecResult>(`/reports/${reportId}/run`, token, { method: "POST" });
      setRunResults((prev) => ({ ...prev, [reportId]: result }));
    } catch (e) {
      setRunError((prev) => ({ ...prev, [reportId]: (e as Error).message }));
    } finally {
      setRunningId(null);
    }
  }

  const schedMut = useMutation({
    mutationFn: ({ id, cron_expr, email_to }: { id: string; cron_expr: string; email_to: string }) =>
      apiFetch(`/reports/${id}/schedules`, token, {
        method: "POST",
        body: JSON.stringify({ cron_expr, email_to, timezone: "UTC", enabled: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setScheduleFor(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/reports/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  if (viewer) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Saved reports are available to Analyst and Admin roles.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Saved reports</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Re-run saved queries to see live results with charts. Schedule automated email delivery.
        </p>
      </div>

      {isLoading && <p className="text-sm">Loading...</p>}

      <ul className="space-y-6">
        {reports.map((r) => (
          <li key={r.id}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <CardDescription>{r.question || "No description"}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 text-xs"
                    onClick={() => { if (confirm("Delete this report?")) deleteMut.mutate(r.id); }}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <details className="text-xs">
                  <summary className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    View SQL
                  </summary>
                  <pre className="mt-2 bg-[hsl(var(--muted))]/35 rounded-md p-3 overflow-x-auto max-h-32 whitespace-pre-wrap">
                    {r.sql_text}
                  </pre>
                </details>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRun(r.id)}
                    disabled={runningId === r.id}
                  >
                    {runningId === r.id ? "Running..." : "Run now"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setScheduleFor(scheduleFor === r.id ? null : r.id)}>
                    {scheduleFor === r.id ? "Hide schedule" : "Add email schedule"}
                  </Button>
                </div>

                {runError[r.id] && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                    {runError[r.id]}
                  </div>
                )}

                {runResults[r.id] && (
                  <div className="mt-4 space-y-3 border border-[hsl(var(--border))] rounded-lg p-4 bg-[hsl(var(--card))]/30">
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                      <span>{runResults[r.id].row_count} rows</span>
                      <span>Chart: {runResults[r.id].chart_type}</span>
                    </div>
                    {runResults[r.id].insight && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] italic">
                        {runResults[r.id].insight}
                      </p>
                    )}
                    <div className="max-h-[400px]">
                      <ResultChart
                        chartType={runResults[r.id].chart_type}
                        columns={runResults[r.id].columns}
                        rows={runResults[r.id].rows}
                      />
                    </div>
                  </div>
                )}

                {scheduleFor === r.id && (
                  <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3 max-w-md bg-[hsl(var(--muted))]/20">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Schedule this report to run automatically and email results. Requires SMTP configured on the server.
                    </p>
                    <div>
                      <Label>Cron expression (UTC)</Label>
                      <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * *" className="mt-1" />
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                        Example: &quot;0 9 * * *&quot; = every day at 9:00 AM UTC
                      </p>
                    </div>
                    <div>
                      <Label>Send results to</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.com" className="mt-1" />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!email.trim()) return;
                        schedMut.mutate({ id: r.id, cron_expr: cron, email_to: email.trim() });
                      }}
                      disabled={schedMut.isPending}
                    >
                      {schedMut.isPending ? "Saving..." : "Save schedule"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {reports.length === 0 && !isLoading && (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
          <p className="text-lg mb-2">No saved reports yet</p>
          <p className="text-sm">Go to Chat, run a query, then click &quot;Save as report&quot; to save it here.</p>
        </div>
      )}
    </div>
  );
}

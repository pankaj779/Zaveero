"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultChart } from "@/components/result-chart";
import { apiFetch } from "@/lib/api";

type Dash = {
  id: string;
  name: string;
  description: string;
  report_order: string[];
};

type Report = { id: string; name: string; question: string };

type ExecResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  chart_type: string;
  row_count: number;
  insight?: string;
};

export default function DashboardsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const viewer = session?.user?.role === "VIEWER";
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [viewDash, setViewDash] = useState<string | null>(null);
  const [dashResults, setDashResults] = useState<Record<string, ExecResult | null>>({});
  const [dashLoading, setDashLoading] = useState(false);
  const [dashErrors, setDashErrors] = useState<Record<string, string>>({});

  const { data: dashboards = [] } = useQuery({
    queryKey: ["dashboards"],
    queryFn: () => apiFetch<Dash[]>("/dashboards", token),
    enabled: !!token && !viewer,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiFetch<Report[]>("/reports", token),
    enabled: !!token && !viewer,
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch("/dashboards", token, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: "", report_order: picked, shared_with_workspace: false }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      setName("");
      setPicked([]);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/dashboards/${id}`, token, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
      if (viewDash) setViewDash(null);
    },
  });

  const openDashboard = useCallback(async (dash: Dash) => {
    setViewDash(dash.id);
    setDashLoading(true);
    setDashResults({});
    setDashErrors({});

    const results: Record<string, ExecResult | null> = {};
    const errors: Record<string, string> = {};
    for (const reportId of dash.report_order) {
      try {
        const res = await apiFetch<ExecResult>(`/reports/${reportId}/run`, token, { method: "POST" });
        results[reportId] = res;
      } catch (e) {
        errors[reportId] = (e as Error).message;
        results[reportId] = null;
      }
    }
    setDashResults(results);
    setDashErrors(errors);
    setDashLoading(false);
  }, [token]);

  function toggleReport(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const reportMap = Object.fromEntries(reports.map((r) => [r.id, r]));
  const activeDash = dashboards.find((d) => d.id === viewDash);

  if (viewer) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Dashboards are available to Analyst and Admin roles.</p>
      </div>
    );
  }

  if (activeDash) {
    return (
      <div className="p-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activeDash.name}</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {activeDash.report_order.length} report(s) in this dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openDashboard(activeDash)}>
              Refresh all
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewDash(null)}>
              Back to list
            </Button>
          </div>
        </div>

        {dashLoading && (
          <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            Loading dashboard reports...
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {activeDash.report_order.map((reportId) => {
            const report = reportMap[reportId];
            const result = dashResults[reportId];
            const error = dashErrors[reportId];

            return (
              <Card key={reportId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{report?.name ?? "Unknown report"}</CardTitle>
                  {report?.question && (
                    <CardDescription className="text-xs">{report.question}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}
                  {result && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {result.row_count} rows | {result.chart_type}
                      </div>
                      <div className="max-h-[300px]">
                        <ResultChart
                          chartType={result.chart_type}
                          columns={result.columns}
                          rows={result.rows}
                        />
                      </div>
                      {result.insight && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] italic mt-2">{result.insight}</p>
                      )}
                    </div>
                  )}
                  {!result && !error && !dashLoading && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Not loaded yet</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Dashboards</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Group saved reports into visual dashboards. Click a dashboard to see all its charts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New dashboard</CardTitle>
          <CardDescription>Select reports to include (save reports from the Chat page first).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sales overview" className="mt-1" />
          </div>
          <div>
            <Label className="mb-2 block">Reports</Label>
            {reports.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">No saved reports yet. Save one from Chat first.</p>
            ) : (
              <ul className="max-h-48 overflow-auto border border-[hsl(var(--border))] rounded-md divide-y divide-[hsl(var(--border))]/60">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggleReport(r.id)} />
                    <span>{r.name}</span>
                    {r.question && (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto truncate max-w-[200px]">
                        {r.question}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            onClick={() => name.trim() && picked.length && createMut.mutate()}
            disabled={createMut.isPending || !name.trim() || !picked.length}
          >
            {createMut.isPending ? "Creating..." : "Create dashboard"}
          </Button>
          {createMut.isError && (
            <p className="text-sm text-red-400">{(createMut.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Your dashboards</h2>
        {dashboards.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No dashboards yet. Create one above.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {dashboards.map((d) => (
              <li key={d.id}>
                <Card className="cursor-pointer hover:border-[hsl(var(--primary))]/50 transition-colors" onClick={() => openDashboard(d)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this dashboard?")) deleteMut.mutate(d.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                    <CardDescription>{d.report_order.length} report(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[hsl(var(--primary))]">Click to view charts</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";

type Hist = {
  id: string;
  connection_id: string;
  question: string;
  sql_text: string;
  result_row_count: number;
  chart_type: string | null;
  explanation: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["history-all"],
    queryFn: () => apiFetch<Hist[]>("/history?limit=200", token),
    enabled: !!token,
  });

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold">Query history</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
        Workspace admins see all queries; Analysts and Viewers see only their own runs.
      </p>
      {isLoading && <p className="mt-6 text-sm">Loading…</p>}
      <ul className="mt-6 space-y-4">
        {rows.map((h) => (
          <li key={h.id} className="rounded-lg border border-[hsl(var(--border))] p-4">
            <div className="flex justify-between gap-4 flex-wrap">
              <p className="font-medium">{h.question || "(ad-hoc)"}</p>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(h.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {h.result_row_count} rows · {h.chart_type || "n/a"}
            </p>
            <pre className="mt-3 text-xs bg-[hsl(var(--muted))]/35 rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{h.sql_text}</pre>
            {h.explanation && <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{h.explanation}</p>}
          </li>
        ))}
      </ul>
      {session?.user?.role === "ADMIN" && (
        <p className="mt-8 text-xs text-[hsl(var(--muted-foreground))]">
          Admin: use API <code className="text-[hsl(var(--primary))]">DELETE /history/{"{id}"}</code> to purge entries.
        </p>
      )}
    </div>
  );
}

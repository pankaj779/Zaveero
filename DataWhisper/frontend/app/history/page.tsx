"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Hist = {
  id: string;
  connection_id: string;
  conversation_id?: string | null;
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
  const qc = useQueryClient();
  const viewer = session?.user?.role === "VIEWER";

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["history-all"],
    queryFn: () => apiFetch<Hist[]>("/history?limit=200", token),
    enabled: !!token,
  });

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold">Query history</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
        Workspace admins see all queries; Analysts and Viewers see only their own runs. Open Chat to replay a
        question from the sidebar.
      </p>
      <Link href="/chat" className="inline-block mt-3 text-sm text-[hsl(var(--primary))] hover:underline">
        Go to Chat →
      </Link>
      {isLoading && <p className="mt-6 text-sm">Loading…</p>}
      <ul className="mt-6 space-y-4">
        {rows.map((h) => (
          <li key={h.id} className="rounded-lg border border-[hsl(var(--border))] p-4">
            <div className="flex justify-between gap-4 flex-wrap items-start">
              <p className="font-medium flex-1">{h.question || "(ad-hoc)"}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(h.created_at).toLocaleString()}
                </span>
                {!viewer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    title="Delete"
                    onClick={async () => {
                      if (!token || !window.confirm("Delete this history entry?")) return;
                      await apiFetch(`/history/${h.id}`, token, { method: "DELETE" });
                      await qc.invalidateQueries({ queryKey: ["history-all"] });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {h.result_row_count} rows · {h.chart_type || "n/a"}
            </p>
            <pre className="mt-3 text-xs bg-[hsl(var(--muted))]/35 rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{h.sql_text}</pre>
            {h.explanation && <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{h.explanation}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";

type Row = {
  id: string;
  action: string;
  user_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const admin = session?.user?.role === "ADMIN";

  const { data: rows = [], error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => apiFetch<Row[]>("/audit?limit=300", token),
    enabled: !!token && admin,
  });

  if (!admin) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Workspace admins can view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Recent security and usage events for this workspace.</p>
      {error && <p className="mt-4 text-sm text-red-400">{(error as Error).message}</p>}
      <ul className="mt-6 space-y-2 text-sm font-mono text-xs">
        {rows.map((r) => (
          <li key={r.id} className="border border-[hsl(var(--border))]/70 rounded-md p-3">
            <span className="text-[hsl(var(--muted-foreground))]">{r.created_at}</span> ·{" "}
            <span className="text-[hsl(var(--primary))]">{r.action}</span>
            {r.resource_type && (
              <span className="text-[hsl(var(--muted-foreground))]">
                {" "}
                · {r.resource_type} {r.resource_id || ""}
              </span>
            )}
            {r.detail && Object.keys(r.detail).length > 0 && (
              <pre className="mt-2 text-[10px] overflow-x-auto whitespace-pre-wrap opacity-80">{JSON.stringify(r.detail)}</pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

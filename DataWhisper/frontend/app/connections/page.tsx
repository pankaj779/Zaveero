"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

type Conn = { id: string; name: string; type: string; created_at: string; updated_at: string };

const types = ["POSTGRES", "MYSQL", "SNOWFLAKE", "BIGQUERY", "DATABRICKS", "SQLSERVER", "REDSHIFT"] as const;

/** Defaults match infra/docker-compose.yml Postgres service (host name is the Docker service: `postgres`). */
const configExamples: Record<string, string> = {
  POSTGRES: `{
  "host": "postgres",
  "port": 5432,
  "database": "datawhisper",
  "user": "datawhisper",
  "password": "datawhisper_secret",
  "sslmode": "disable"
}`,
  MYSQL: `{
  "host": "host.docker.internal",
  "port": 3306,
  "database": "mydb",
  "user": "root",
  "password": "secret"
}`,
  SNOWFLAKE: `{
  "account": "xy12345.us-east-1",
  "user": "USER",
  "password": "secret",
  "warehouse": "COMPUTE_WH",
  "database": "MYDB",
  "schema": "PUBLIC",
  "role": "ACCOUNTADMIN"
}`,
  BIGQUERY: `{
  "project_id": "my-gcp-project",
  "dataset": "analytics",
  "service_account_json": "{\\"type\\":\\"service_account\\",\\"project_id\\":\\"my-gcp-project\\"}"
}`,
  DATABRICKS: `{
  "host": "adb-xxx.azuredatabricks.net",
  "http_path": "/sql/1.0/warehouses/xxxx",
  "token": "dapi...",
  "catalog": "agentops",
  "schema": "*"
}`,
  SQLSERVER: `{
  "host": "host.docker.internal",
  "port": 1433,
  "database": "mydb",
  "user": "sa",
  "password": "YourStrong!Passw0rd"
}`,
  REDSHIFT: `{
  "host": "default.abc123.us-east-1.redshift.amazonaws.com",
  "port": 5439,
  "database": "dev",
  "user": "admin",
  "password": "secret"
}`,
};

export default function ConnectionsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("POSTGRES");
  const [configText, setConfigText] = useState(configExamples.POSTGRES);
  const [testType, setTestType] = useState<(typeof types)[number]>("POSTGRES");
  const [testConfig, setTestConfig] = useState(configExamples.POSTGRES);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: () => apiFetch<Conn[]>("/connections", token),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const config = JSON.parse(configText);
      return apiFetch<Conn>("/connections", token, {
        method: "POST",
        body: JSON.stringify({ name, type, config }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      setName("");
    },
  });

  const testMut = useMutation({
    mutationFn: async () => {
      const config = JSON.parse(testConfig);
      return apiFetch<{ ok: boolean }>("/connections/test", token, {
        method: "POST",
        body: JSON.stringify({ type: testType, config }),
      });
    },
  });

  const scanMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ version: number; tables_scanned: number; edges: number }>(`/metadata/${id}/scan`, token, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch<unknown>(`/connections/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });

  return (
      <div className="p-8 max-w-4xl space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Database connections</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Credentials are encrypted at rest. Run a scan after saving.
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3 space-y-2">
            <span>
              The API runs <strong>inside Docker</strong>: use <code className="text-[hsl(var(--primary))]">postgres</code> as host to
              reach this project&apos;s Compose Postgres (sample below). For MySQL or other DBs on your PC, use{" "}
              <code className="text-[hsl(var(--primary))]">host.docker.internal</code>—not <code>localhost</code> (that points at the
              container itself).
            </span>
            <span className="block pt-2 border-t border-[hsl(var(--border))]">
              <strong>Optional NL→SQL guardrails:</strong> add an <code className="text-[hsl(var(--primary))]">ai_data_scope</code> object
              next to host/password in the saved config: <code>allowed_table_prefixes</code> (whitelist prefixes, case-insensitive),{" "}
              <code>blocked_name_substrings</code>, and <code>code_lineage_environments</code> (e.g.{" "}
              <code>[&quot;PRODUCTION&quot;,&quot;UNKNOWN&quot;]</code>). Metadata scans strip this key before connecting; AI and execute
              use the filtered table list.
            </span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test connection (no save)</CardTitle>
            <CardDescription>Validate credentials before storing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div>
                <Label>Type</Label>
                <select
                  className="mt-1 flex h-10 w-48 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
                  value={testType}
                  onChange={(e) => {
                    const t = e.target.value as (typeof types)[number];
                    setTestType(t);
                    setTestConfig(configExamples[t]);
                  }}
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Config JSON</Label>
              <textarea
                className="mt-1 w-full min-h-[140px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-xs font-mono"
                value={testConfig}
                onChange={(e) => setTestConfig(e.target.value)}
              />
            </div>
            <Button onClick={() => testMut.mutate()} disabled={testMut.isPending}>
              {testMut.isPending ? "Testing…" : "Test connection"}
            </Button>
            {testMut.isSuccess && <p className="text-sm text-emerald-400">Connection OK</p>}
            {testMut.isError && <p className="text-sm text-red-400">{(testMut.error as Error).message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production DW" />
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
                value={type}
                onChange={(e) => {
                  const t = e.target.value as (typeof types)[number];
                  setType(t);
                  setConfigText(configExamples[t]);
                }}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Config JSON</Label>
              <textarea
                className="mt-1 w-full min-h-[160px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-xs font-mono"
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
              />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !name}>
              {createMut.isPending ? "Saving…" : "Save connection"}
            </Button>
            {createMut.isError && <p className="text-sm text-red-400">{(createMut.error as Error).message}</p>}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-4">Your connections</h2>
          {isLoading && <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>}
          <ul className="space-y-3">
            {connections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {c.type} · {c.id.slice(0, 8)}…
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => scanMut.mutate(c.id)} disabled={scanMut.isPending}>
                  Scan metadata
                </Button>
                <Button size="sm" variant="destructive" onClick={() => delMut.mutate(c.id)} disabled={delMut.isPending}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          {scanMut.isSuccess && (
            <p className="text-sm text-emerald-400 mt-2">
              Scan complete: v{scanMut.data?.version}, {scanMut.data?.tables_scanned} tables, {scanMut.data?.edges} FK edges
            </p>
          )}
          {scanMut.isError && <p className="text-sm text-red-400 mt-2">{(scanMut.error as Error).message}</p>}
        </div>
      </div>
  );
}

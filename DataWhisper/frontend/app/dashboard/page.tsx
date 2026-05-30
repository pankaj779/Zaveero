"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type Usage = {
  total_ai_generations: number;
  total_executions: number;
  workspace_id: string;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const admin = session?.user?.role === "ADMIN";

  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => apiFetch<Usage>("/usage/me", token),
    enabled: !!token,
  });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold">Workspace overview</h1>
      <p className="text-[hsl(var(--muted-foreground))] mt-2">
        Teammates use Chat in plain English—the product generates and validates SQL for them. Connections and history are
        shared in the workspace; lineage is stored per metadata scan.
      </p>
      {admin && (
        <p className="text-sm mt-3 text-[hsl(var(--muted-foreground))]">
          <Link href="/team" className="text-[hsl(var(--primary))] hover:underline">
            Team & access
          </Link>{" "}
          — invite users, set Viewer vs Analyst, and control whether people can join with your workspace slug.
        </p>
      )}

      {usage && (
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your usage</CardTitle>
              <CardDescription>AI generate calls and SQL executions (this account).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">AI generations:</span>{" "}
                <span className="font-mono">{usage.total_ai_generations}</span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Executions:</span>{" "}
                <span className="font-mono">{usage.total_executions}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Connections</CardTitle>
            <CardDescription>Encrypted credentials with one-click test. Supports 7 database types.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/connections">
              <Button>Manage connections</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Ask questions in plain English. Get validated SQL, charts, and conversation memory.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/chat">
              <Button>Open chat</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lineage</CardTitle>
            <CardDescription>Explore table relationships, join paths, and FK/inferred edges visually.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/lineage">
              <Button variant="outline">View lineage</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Crawler</CardTitle>
            <CardDescription>Crawl GitHub repos and data sources to build end-to-end data lineage automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/crawler">
              <Button>Open crawler</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Save queries as reusable reports. Schedule automated runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports">
              <Button variant="outline">Saved reports</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dashboards</CardTitle>
            <CardDescription>Organize saved reports into dashboards for executives and teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboards">
              <Button variant="outline">View dashboards</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Browse all past queries, results, confidence scores, and charts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/history">
              <Button variant="outline">Query history</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

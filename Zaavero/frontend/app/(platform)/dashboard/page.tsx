"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Activity, ArrowUpRight, MessageSquare, Package, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/api";
import { formatPlanTier } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  activity: Activity,
  "message-square": MessageSquare,
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const token = session?.accessToken || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => platformApi.dashboard(token),
    enabled: !!token,
  });

  if (isLoading) {
    return <div className="p-8 text-[hsl(var(--muted-foreground))]">Loading workspace overview...</div>;
  }
  if (error || !data) {
    return <div className="p-8 text-red-500">Failed to load dashboard. Is the API running?</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Workspace Overview</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          {data.workspace.name} · {formatPlanTier(data.plan_tier)} plan
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products Enabled</CardDescription>
            <CardTitle className="text-3xl">{data.total_products_enabled}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{data.total_users}</CardTitle>
          </CardHeader>
          <CardContent>
            <Users className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users (7d)</CardDescription>
            <CardTitle className="text-3xl">{data.active_users_7d}</CardTitle>
          </CardHeader>
          <CardContent>
            <Users className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Product Launches (7d)</CardDescription>
            <CardTitle className="text-3xl">{data.usage_metrics.product_launches_7d ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Zap className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Enabled Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Products</CardTitle>
              <CardDescription>Launch enabled modules</CardDescription>
            </div>
            <Link href="/marketplace">
              <Button variant="outline" size="sm">Marketplace</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.enabled_products.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No products enabled yet.{" "}
                <Link href="/marketplace" className="text-[hsl(var(--primary))] hover:underline">
                  Browse marketplace
                </Link>
              </p>
            ) : (
              data.enabled_products.map((p) => {
                const Icon = iconMap[p.icon] || Package;
                return (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{p.tagline}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>Platform updates and news</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No announcements</p>
            ) : (
              data.announcements.map((a) => (
                <div key={a.id} className="border-b border-[hsl(var(--border))] pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={a.type === "feature" ? "success" : "secondary"}>{a.type}</Badge>
                  </div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{a.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Workspace audit trail</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No activity yet</p>
          ) : (
            <ul className="space-y-3">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm border-b border-[hsl(var(--border))] pb-3 last:border-0">
                  <div>
                    <span className="font-medium">{a.action.replace(/\./g, " · ")}</span>
                    {a.user && (
                      <span className="text-[hsl(var(--muted-foreground))] ml-2">
                        by {a.user.name || a.user.email}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

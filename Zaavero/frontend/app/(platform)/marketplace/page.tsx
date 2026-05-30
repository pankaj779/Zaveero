"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Activity, Lock, MessageSquare, Package, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/api";
import { formatPlanTier, formatPrice } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  activity: Activity,
  "message-square": MessageSquare,
  workflow: Workflow,
};

export default function MarketplacePage() {
  const { data: session } = useSession();
  const token = session?.accessToken || "";
  const isAdmin = session?.user?.role === "ADMIN";
  const queryClient = useQueryClient();
  const [enableError, setEnableError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => platformApi.marketplace(token),
    enabled: !!token,
  });

  const enableMutation = useMutation({
    mutationFn: (slug: string) => platformApi.enableProduct(token, slug),
    onSuccess: () => {
      setEnableError("");
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => setEnableError(err.message),
  });

  if (isLoading) return <div className="p-8">Loading marketplace...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Product Marketplace</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Add modules to your constellation · Current plan: {formatPlanTier(data?.plan_tier || "free")}
        </p>
      </div>

      {enableError && (
        <p className="text-sm text-red-500 rounded-lg bg-red-500/10 px-4 py-3">{enableError}</p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(data?.products || []).map((p) => {
          const Icon = iconMap[p.icon] || Package;
          return (
            <Card key={p.slug} className={p.enabled ? "border-emerald-500/30" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.enabled && <Badge variant="success">Enabled</Badge>}
                    {p.status === "COMING_SOON" && <Badge variant="warning">Coming Soon</Badge>}
                    {!p.plan_eligible && !p.enabled && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" /> {formatPlanTier(p.min_plan_tier)}+
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4">
                  <Link href={`/products/${p.slug}`} className="hover:text-[hsl(var(--primary))]">
                    {p.name}
                  </Link>
                </CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-3">{p.description}</p>
                <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                  <span>{formatPlanTier(p.min_plan_tier)} plan</span>
                  {p.addon_price_cents > 0 && <span>+{formatPrice(p.addon_price_cents)}/mo</span>}
                </div>
                {p.enabled ? (
                  <Link href={`/products/${p.slug}`}>
                    <Button variant="outline" className="w-full">
                      Open product
                    </Button>
                  </Link>
                ) : p.can_enable && isAdmin ? (
                  <Button
                    className="w-full"
                    disabled={enableMutation.isPending}
                    onClick={() => enableMutation.mutate(p.slug)}
                  >
                    Enable for workspace
                  </Button>
                ) : p.status === "COMING_SOON" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Notify me
                  </Button>
                ) : !p.plan_eligible ? (
                  <Button variant="outline" className="w-full" disabled>
                    Upgrade plan required
                  </Button>
                ) : !isAdmin ? (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Admin required to enable</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

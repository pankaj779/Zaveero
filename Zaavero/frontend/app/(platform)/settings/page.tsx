"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CreditCard, ExternalLink, User, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/api";
import { formatPlanTier, formatPrice } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken || "";

  const { data: billing } = useQuery({
    queryKey: ["billing"],
    queryFn: () => platformApi.billing(token),
    enabled: !!token,
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => platformApi.members(token),
    enabled: !!token,
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">Profile, workspace, billing, and team</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Name</span>
            <span>{session?.user?.name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Email</span>
            <span>{session?.user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Role</span>
            <Badge variant="secondary">{session?.user?.role}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Workspace</span>
            <span>{session?.user?.workspaceName}</span>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Billing
          </CardTitle>
          <CardDescription>
            {billing?.stripe_configured
              ? "Manage your subscription via Stripe"
              : "Stripe integration ready — connect STRIPE_SECRET_KEY to enable checkout"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Current plan</span>
            <Badge>{formatPlanTier(billing?.plan_tier || "free")}</Badge>
          </div>
          {billing?.billing_email && (
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Billing email</span>
              <span>{billing.billing_email}</span>
            </div>
          )}
          {billing?.addons && billing.addons.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Product add-ons</p>
              <ul className="space-y-1">
                {billing.addons.map((a) => (
                  <li key={a.product_slug} className="text-sm flex justify-between">
                    <span>{a.product_name}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">×{a.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {(billing?.available_plans || []).slice(0, 3).map((plan) => (
              <div key={plan.slug} className="border border-[hsl(var(--border))] rounded-lg p-3">
                <p className="font-medium">{plan.name}</p>
                <p className="text-lg font-bold mt-1">
                  {formatPrice(plan.price_monthly_cents)}
                  {plan.price_monthly_cents > 0 && <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">/mo</span>}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {plan.max_users} users · {plan.max_products} products
                </p>
              </div>
            ))}
          </div>
          <Button variant="outline" disabled={!billing?.stripe_configured}>
            {billing?.stripe_configured ? "Manage subscription" : "Stripe not configured"}
          </Button>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Team
          </CardTitle>
          <CardDescription>Workspace members</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {(members || []).map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm border-b border-[hsl(var(--border))] pb-3 last:border-0">
                <div>
                  <p className="font-medium">{m.name || m.email}</p>
                  <p className="text-[hsl(var(--muted-foreground))]">{m.email}</p>
                </div>
                <Badge variant="secondary">{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Activity, ExternalLink, MessageSquare, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/api";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  activity: Activity,
  "message-square": MessageSquare,
};

export default function ProductsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken || "";

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => platformApi.products(token),
    enabled: !!token,
  });

  if (isLoading) return <div className="p-8">Loading products...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">Manage and launch your enabled modules</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(products || []).map((p) => {
          const Icon = iconMap[p.icon] || Package;
          return (
            <Card key={p.slug}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                  </div>
                  <Badge variant={p.enabled ? "success" : "secondary"}>
                    {p.enabled ? "Enabled" : p.status === "COMING_SOON" ? "Coming Soon" : "Not enabled"}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{p.name}</CardTitle>
                <CardDescription>{p.tagline || p.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Link href={`/products/${p.slug}`}>
                  <Button variant="outline" size="sm">Details</Button>
                </Link>
                {p.enabled && p.status === "ACTIVE" && (
                  <Link href={`/products/${p.slug}`}>
                    <Button size="sm" className="gap-1">
                      Launch <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

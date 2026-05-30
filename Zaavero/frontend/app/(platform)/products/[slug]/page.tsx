"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Activity, ArrowLeft, ExternalLink, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/api";
import { launchHint, resolveDocumentationUrl } from "@/lib/product-urls";
import { formatPlanTier, formatPrice } from "@/lib/utils";

const PRODUCT_INFO: Record<string, { icon: React.ComponentType<{ className?: string }>; features: string[] }> = {
  agentops: {
    icon: Activity,
    features: [
      "Agent health monitoring",
      "Latency & error tracking",
      "Token usage & cost tracking",
      "MLflow trace analysis",
      "Unity Catalog governance",
      "Databricks Apps deployment",
    ],
  },
  datawhisper: {
    icon: MessageSquare,
    features: [
      "Natural language to SQL",
      "Metadata scanning & lineage",
      "Read-only query execution",
      "Confidence scores & explanations",
      "Dashboard & report generation",
      "Code crawler for lineage",
    ],
  },
};

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const token = session?.accessToken || "";
  const isAdmin = session?.user?.role === "ADMIN";
  const queryClient = useQueryClient();
  const [launchError, setLaunchError] = useState("");
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [launchHintMsg, setLaunchHintMsg] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => platformApi.products(token),
    enabled: !!token,
  });

  const product = products?.find((p) => p.slug === slug);
  const info = PRODUCT_INFO[slug];
  const Icon = info?.icon || Activity;

  const launchMutation = useMutation({
    mutationFn: () => platformApi.launchProduct(token, slug),
    onSuccess: (data) => {
      setLaunchError("");
      if (!data.launch_url) {
        setLaunchError("Launch URL is not configured for this product.");
        setLaunchUrl(null);
        return;
      }
      setLaunchUrl(data.launch_url);
      setLaunchHintMsg(launchHint(data.launch_url));
      const opened = window.open(data.launch_url, "_blank", "noopener,noreferrer");
      if (!opened) {
        setLaunchError("Your browser blocked the popup. Use the Open product link below.");
      }
    },
    onError: (err: Error) => {
      setLaunchUrl(null);
      setLaunchHintMsg(null);
      setLaunchError(err.message);
    },
  });

  const enableMutation = useMutation({
    mutationFn: () => platformApi.enableProduct(token, slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  if (!product) {
    return (
      <div className="p-8">
        <Link href="/products" className="text-sm text-[hsl(var(--primary))] flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>
        <p>Product not found</p>
      </div>
    );
  }

  const docHref = resolveDocumentationUrl(slug, product.documentation_url);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <Link href="/products" className="text-sm text-[hsl(var(--primary))] flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="flex items-start gap-6">
        <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
          <Icon className="h-8 w-8 text-[hsl(var(--primary))]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Badge variant={product.enabled ? "success" : "secondary"}>
              {product.enabled ? "Enabled" : product.status}
            </Badge>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">{product.tagline}</p>
          <p className="mt-4">{product.long_description || product.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {product.enabled && product.status === "ACTIVE" && (
          <Button onClick={() => launchMutation.mutate()} disabled={launchMutation.isPending} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {launchMutation.isPending ? "Launching..." : "Launch product"}
          </Button>
        )}
        {!product.enabled && product.status === "ACTIVE" && isAdmin && (
          <Button onClick={() => enableMutation.mutate()} disabled={enableMutation.isPending}>
            {enableMutation.isPending ? "Enabling..." : "Enable for workspace"}
          </Button>
        )}
        {!product.enabled && !isAdmin && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Ask your workspace admin to enable this product.</p>
        )}
        <Link href={docHref}>
          <Button variant="outline">Documentation</Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="ghost">View in marketplace</Button>
        </Link>
        <Link href={`/solutions/${slug}`} target="_blank">
          <Button variant="ghost">Public product page</Button>
        </Link>
      </div>

      {launchHintMsg && !launchError && (
        <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg bg-amber-500/10 px-3 py-2">{launchHintMsg}</p>
      )}
      {launchError && (
        <p className="text-sm text-red-500 rounded-lg bg-red-500/10 px-3 py-2">{launchError}</p>
      )}
      {launchUrl && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Didn&apos;t open?{" "}
          <a href={launchUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] underline">
            Open product in a new tab
          </a>
        </p>
      )}

      {info?.features && (
        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid sm:grid-cols-2 gap-2">
              {info.features.map((f) => (
                <li key={f} className="text-sm flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan requirements</CardTitle>
          <CardDescription>
            Requires {formatPlanTier(product.min_plan_tier)} plan
            {product.addon_price_cents > 0 && ` · Add-on ${formatPrice(product.addon_price_cents)}/mo`}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

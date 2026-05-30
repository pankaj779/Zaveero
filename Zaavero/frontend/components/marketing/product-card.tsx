"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PlatformProduct } from "@/lib/products";
import { PRODUCT_ICONS } from "@/lib/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProductShowcaseCard({ product }: { product: PlatformProduct }) {
  const Icon = PRODUCT_ICONS[product.icon] ?? PRODUCT_ICONS.activity;
  const available = product.status === "available";

  return (
    <Card className="group overflow-hidden border-[hsl(var(--border))] transition hover:border-[hsl(var(--primary))]/40 hover:shadow-xl hover:shadow-indigo-500/5">
      <div className={cn("h-1.5 bg-gradient-to-r", product.color)} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              product.color
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant={available ? "success" : "warning"}>
            {available ? "Available" : "Coming soon"}
          </Badge>
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          {product.category}
        </p>
        <h3 className="mt-1 text-xl font-semibold">{product.name}</h3>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{product.description}</p>
        <ul className="mt-4 space-y-1.5">
          {product.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-2">
          <Link href={`/solutions/${product.slug}`} className="flex-1">
            <Button variant="outline" className="w-full gap-1">
              Learn more <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          {available && (
            <Link href="/login?mode=register">
              <Button className="gap-1">
                Enable
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

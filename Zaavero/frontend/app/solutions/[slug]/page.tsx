import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProduct, PRODUCT_ICONS } from "@/lib/products";
import { cn } from "@/lib/utils";

export default function SolutionPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const Icon = PRODUCT_ICONS[product.icon] ?? PRODUCT_ICONS.activity;
  const available = product.status === "available";

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="hero-grid border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Link href="/#products" className="text-sm text-[hsl(var(--primary))] hover:underline">
            ← All products
          </Link>
          <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-start">
            <div
              className={cn(
                "flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-xl",
                product.color
              )}
            >
              <Icon className="h-10 w-10" />
            </div>
            <div>
              <Badge variant={available ? "success" : "warning"} className="mb-3">
                {available ? "Available on Zaavero" : "Coming soon"}
              </Badge>
              <p className="section-label">{product.category}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{product.name}</h1>
              <p className="mt-4 text-lg text-[hsl(var(--muted-foreground))]">{product.tagline}</p>
              <p className="mt-6 max-w-2xl leading-relaxed text-[hsl(var(--muted-foreground))]">
                {product.longDescription}
              </p>
              {available && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/login">
                    <Button size="lg" className="gap-2">
                      Enable in your workspace <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/about">
                    <Button size="lg" variant="outline">
                      About Zaavero
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold">Capabilities</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {product.features.map((f) => (
            <div key={f} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold">Built for</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {product.useCases.map((u) => (
              <span
                key={u}
                className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm"
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

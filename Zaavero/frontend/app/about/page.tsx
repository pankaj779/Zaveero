import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { BRAND, BRAND_VALUES } from "@/lib/brand";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="hero-grid border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="section-label mb-4">About {BRAND.name}</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {BRAND.tagline} for modern enterprises
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
            {BRAND.shortDescription} We lead with AI and data because that&apos;s where teams feel the
            pain first — the platform is built to orbit every domain you need.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Our mission</h2>
            <p className="mt-4 text-[hsl(var(--muted-foreground))] leading-relaxed">{BRAND.mission}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">What we build today</h2>
            <p className="mt-4 text-[hsl(var(--muted-foreground))] leading-relaxed">
              AgentOps for AI agent observability. DataWhisper for natural language analytics. Pipeline Studio
              and more on the roadmap. Each module plugs into your workspace — enable what you need, launch with
              SSO, manage through one subscription.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-center text-2xl font-bold">Why teams choose {BRAND.name}</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {BRAND_VALUES.map((v, i) => (
              <div key={v.title} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-sm font-bold text-[hsl(var(--primary))]">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-2xl font-bold">See your constellation take shape</h2>
        <p className="mt-4 text-[hsl(var(--muted-foreground))]">
          Create a workspace in minutes. No credit card required for evaluation.
        </p>
        <Link href="/login?mode=register" className="mt-8 inline-block">
          <Button size="lg" className="gap-2">
            Get started <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}

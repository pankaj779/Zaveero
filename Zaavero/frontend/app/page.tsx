import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { ProductShowcaseCard } from "@/components/marketing/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_CATEGORIES, PLATFORM_PRODUCTS } from "@/lib/products";
import { BRAND } from "@/lib/brand";

const plans = [
  { name: "Starter", price: "$99", period: "/mo", featured: false, features: ["2 products", "10 users", "SSO launch", "Email support"] },
  { name: "Pro", price: "$299", period: "/mo", featured: true, features: ["5 products", "50 users", "Feature flags", "Priority support"] },
  { name: "Enterprise", price: "Custom", period: "", featured: false, features: ["Unlimited products", "Custom SLA", "SAML/SCIM", "Dedicated support"] },
];

const faqs = [
  { q: "What is Zaavero?", a: BRAND.shortDescription },
  { q: "Is Zaavero only for data and AI?", a: "We launch with powerful data and AI modules, but Zaavero is domain-agnostic — a constellation ready for analytics, operations, finance, HR, and whatever your organization needs next." },
  { q: "How does SSO work?", a: "Sign in once on Zaavero. Enable a module, click Launch, and step into that application through a secure, short-lived token — no second login." },
  { q: "Can I add products later?", a: "Yes. Browse the marketplace, enable modules for your workspace, and manage everything from one settings and billing console." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Hero */}
      <section className="hero-grid relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:py-36">
          <Badge variant="secondary" className="mb-6 gap-1">
            <Sparkles className="h-3 w-3" /> {BRAND.domain} — {BRAND.tagline}
          </Badge>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl md:leading-[1.05]">
            {BRAND.heroHeadline}{" "}
            <span className="gradient-text">{BRAND.heroHighlight}</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-[hsl(var(--muted-foreground))] md:text-xl">
            {BRAND.heroSubhead}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/login?mode=register">
              <Button size="lg" className="h-12 px-8 gap-2 shadow-lg shadow-teal-500/20">
                Create your workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="h-12 px-8">
                About Zaavero
              </Button>
            </Link>
          </div>
          <div className="mt-16 flex flex-wrap gap-8 text-sm text-[hsl(var(--muted-foreground))]">
            <span>✓ Single sign-on</span>
            <span>✓ Modular marketplace</span>
            <span>✓ Role-based access</span>
            <span>✓ Unified billing</span>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="section-label mb-4">Mission</p>
          <p className="text-xl font-medium leading-relaxed md:text-2xl">
            {BRAND.mission}
          </p>
        </div>
      </section>

      {/* Platform categories */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-8 md:grid-cols-3">
          {PLATFORM_CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="text-center md:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 md:mx-0">
                  <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{c.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <p className="section-label mb-3">Products</p>
            <h2 className="text-3xl font-bold md:text-4xl">Applications on the platform</h2>
            <p className="mx-auto mt-4 max-w-xl text-[hsl(var(--muted-foreground))]">
              Click any product to learn more. Enable from your workspace marketplace after sign-up.
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_PRODUCTS.map((p) => (
              <ProductShowcaseCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-14">
          <p className="section-label mb-3">Pricing</p>
          <h2 className="text-3xl font-bold">Platform subscription + add-ons</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.featured ? "border-[hsl(var(--primary))] shadow-xl ring-1 ring-[hsl(var(--primary))]/20" : ""}>
              <CardHeader>
                {plan.featured && <Badge className="w-fit mb-2">Most popular</Badge>}
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=register" className="mt-6 block">
                  <Button variant={plan.featured ? "default" : "outline"} className="w-full">
                    Get started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stories + FAQ + CTA */}
      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">Trusted by forward-thinking teams</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              "We replaced three disconnected tools with one Zaavero constellation.",
              "SSO into AgentOps and DataWhisper gave our team back hours every week.",
              "The marketplace lets us grow our stack without renegotiating every vendor.",
            ].map((quote, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-sm italic text-[hsl(var(--muted-foreground))]">
                  &ldquo;{quote}&rdquo;
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold mb-12">FAQ</h2>
        <div className="space-y-8">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="font-semibold">{faq.q}</h3>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="border-t border-[hsl(var(--border))] py-24 text-center">
        <h2 className="text-3xl font-bold">Ready to assemble your constellation?</h2>
        <p className="mx-auto mt-4 max-w-lg text-[hsl(var(--muted-foreground))]">
          Create your workspace, enable modules, and launch with SSO — in under five minutes.
        </p>
        <Link href="/login" className="mt-8 inline-block">
          <Button size="lg">Start free</Button>
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}

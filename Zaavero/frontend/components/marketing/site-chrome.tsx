import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const links = [
  { href: "/#products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/login?mode=register">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo size="sm" />
          <p className="mt-4 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            {BRAND.footerBlurb}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Platform</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-[hsl(var(--primary))]">About</Link></li>
            <li><Link href="/#products" className="hover:text-[hsl(var(--primary))]">Products</Link></li>
            <li><Link href="/login" className="hover:text-[hsl(var(--primary))]">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Contact</p>
          <ul className="mt-4 space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
            <li><a href="mailto:hello@zaavero.com">hello@zaavero.com</a></li>
            <li>zaavero.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[hsl(var(--border))] px-6 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        © {new Date().getFullYear()} Zaavero, Inc. All rights reserved.
      </div>
    </footer>
  );
}

"use client";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_KEYS = [
  { href: "#home", key: "home" as const },
  { href: "#about", key: "about" as const },
  { href: "#services", key: "services" as const },
  { href: "#portfolio", key: "projects" as const },
  { href: "#pricing", key: "pricing" as const },
  { href: "#get-quote", key: "getQuote" as const },
  { href: "#testimonials", key: "testimonials" as const },
  { href: "#contact", key: "contact" as const },
];

type HeaderProps = {
  standalone?: boolean;
};

export function Header({ standalone = false }: HeaderProps) {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(standalone);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (standalone) return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [standalone]);

  const handleNavClick = () => setMobileOpen(false);
  const isLight = scrolled || standalone;

  const homeHref = standalone ? "/#home" : "#home";
  const navHref = (hash: string) => (standalone ? `/${hash}` : hash);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        isLight ? "bg-white/95 shadow-sm backdrop-blur-md" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href={homeHref} onClick={handleNavClick}>
          <Logo theme={isLight ? "dark" : "light"} />
        </Link>

        <nav className="hidden items-center gap-6 xl:gap-8 lg:flex">
          {NAV_KEYS.map((link) => (
            <a
              key={link.href}
              href={navHref(link.href)}
              className={cn(
                "text-xs font-medium uppercase tracking-[0.15em] transition-colors hover:text-gold",
                isLight ? "text-charcoal" : "text-white/90"
              )}
            >
              {link.key === "getQuote" ? t.nav.getQuote : t.nav[link.key]}
            </a>
          ))}
          <Link
            href="/get-quote/track"
            className={cn(
              "text-xs font-medium uppercase tracking-[0.15em] transition-colors hover:text-gold",
              isLight ? "text-charcoal" : "text-white/90"
            )}
          >
            {t.nav.trackQuote}
          </Link>
          <LanguageSwitcher light={!isLight} />
          <a href={navHref("#get-quote")}>
            <Button variant={isLight ? "primary" : "outline"} size="sm">
              {t.nav.getQuote}
            </Button>
          </a>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          <LanguageSwitcher light={!isLight} />
          <button
            type="button"
            className={cn(isLight ? "text-charcoal" : "text-white")}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-6 lg:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_KEYS.map((link) => (
              <a
                key={link.href}
                href={navHref(link.href)}
                onClick={handleNavClick}
                className="text-sm font-medium uppercase tracking-wider text-charcoal hover:text-gold"
              >
                {link.key === "getQuote" ? t.nav.getQuote : t.nav[link.key]}
              </a>
            ))}
            <Link
              href="/get-quote/track"
              onClick={handleNavClick}
              className="text-sm font-medium uppercase tracking-wider text-charcoal hover:text-gold"
            >
              {t.nav.trackQuote}
            </Link>
            <a href={navHref("#get-quote")} onClick={handleNavClick}>
              <Button variant="primary" size="sm" className="w-full">
                {t.nav.getQuote}
              </Button>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

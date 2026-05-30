"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Activity,
  BookOpen,
  Globe,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPlanTier } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/about", label: "About", icon: Globe },
  { href: "/documentation", label: "Documentation", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const productLinks = [
  { slug: "agentops", label: "AgentOps", icon: Activity, href: "/products/agentops" },
  { slug: "datawhisper", label: "DataWhisper", icon: MessageSquare, href: "/products/datawhisper" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <Link href="/dashboard">
            <Logo size="sm" />
          </Link>
          {session?.user?.workspaceName && (
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] truncate">
              {session.user.workspaceName}
            </p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[hsl(var(--border))]">
            <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Products
            </p>
            {productLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.slug}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-medium">
              {(session?.user?.name || session?.user?.email || "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name || session?.user?.email}</p>
              <Badge variant="secondary" className="mt-0.5">{session?.user?.role}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
          <Link href="/dashboard"><Logo size="sm" showWordmark={false} /></Link>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

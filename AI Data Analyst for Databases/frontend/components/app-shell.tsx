"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  GitFork,
  Database,
  FileText,
  LayoutGrid,
  Clock,
  User,
  Users,
  Shield,
  Search,
  Sun,
  Moon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/lineage", label: "Lineage", icon: GitFork },
  { href: "/crawler", label: "Crawler", icon: Search },
  { href: "/connections", label: "Connections", icon: Database },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { href: "/history", label: "History", icon: Clock },
  { href: "/account", label: "Account", icon: User },
  { href: "/team", label: "Team & access", icon: Users, adminOnly: true },
  { href: "/audit", label: "Audit", icon: Shield, adminOnly: true },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9" />;

  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors",
        "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/60 hover:text-[hsl(var(--foreground))]"
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-4 flex flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-[hsl(var(--primary))]">
            DataWhisper
          </Link>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
            {data?.user?.workspaceName || "Workspace"}
            {data?.user?.workspaceSlug ? (
              <span className="block text-[10px] opacity-80 mt-0.5">/{data.user.workspaceSlug}</span>
            ) : null}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav
            .filter((item) => !("adminOnly" in item && item.adminOnly) || data?.user?.role === "ADMIN")
            .map((item) => {
              const Icon = item.icon;
              return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors flex items-center gap-2.5",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/60 hover:text-[hsl(var(--foreground))]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
              );
            })}
        </nav>
        <div className="mt-auto space-y-2">
          <ThemeToggle />
          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{data?.user?.email}</p>
          <span
            className={
              data?.user?.role === "ADMIN"
                ? "text-[10px] uppercase tracking-wider text-amber-400/90"
                : "text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"
            }
          >
            {data?.user?.role === "ADMIN"
              ? "Workspace admin"
              : data?.user?.role === "VIEWER"
                ? "Viewer"
                : "Analyst"}
          </span>
          <Button variant="outline" size="sm" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]/50 text-center mt-2">
            DataWhisper v2.0
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

"use client";

import { Logo } from "@/components/brand/Logo";
import {
  FileText,
  FolderOpen,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: FolderOpen },
  { href: "/admin/pricing", label: "Pricing", icon: IndianRupee },
  { href: "/admin/quotations", label: "Quotations", icon: FileText },
  { href: "/admin/inquiries", label: "Inquiries", icon: Mail },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`mb-1 flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-gold/10 text-gold"
              : "text-charcoal hover:bg-gold/10 hover:text-gold"
          }`}
        >
          <item.icon size={18} />
          {item.label}
        </Link>
      ))}
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-1 flex items-center gap-3 px-4 py-3 text-sm text-charcoal transition-colors hover:bg-gold/10 hover:text-gold"
      >
        View Website
      </Link>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:flex-row">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <Logo variant="icon" />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle admin menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-b border-gray-200 bg-white p-4 lg:hidden">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </nav>
      )}

      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="border-b p-6">
          <Logo variant="full" />
          <p className="mt-2 text-xs uppercase tracking-wider text-gray-medium">
            Admin Panel
          </p>
        </div>
        <nav className="p-4">
          <NavLinks />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

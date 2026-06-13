import { requireAdmin } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/data";
import {
  FileText,
  FolderOpen,
  IndianRupee,
  Mail,
  MessageSquare,
  Plus,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = await getDashboardStats();

  const cards = [
    {
      label: "Projects",
      value: stats.projectCount,
      href: "/admin/projects",
      icon: FolderOpen,
    },
    {
      label: "Pricing Items",
      value: stats.pricingCount,
      href: "/admin/pricing",
      icon: IndianRupee,
    },
    {
      label: "Client Quotations",
      value: stats.quotationCount,
      href: "/admin/quotations",
      icon: FileText,
    },
    {
      label: "Testimonials",
      value: stats.testimonialCount,
      href: "/admin/testimonials",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-medium">
        Welcome back. Manage your website content from here.
      </p>

      <div className="mt-8 border-2 border-gold bg-gold/5 p-6">
        <h2 className="font-serif text-xl font-semibold text-black">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/pricing"
            className="inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-medium text-black hover:bg-gold-dark"
          >
            <IndianRupee size={16} />
            Edit Pricing
          </Link>
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:border-gold"
          >
            <Plus size={16} />
            Add Photos & Videos
          </Link>
          <Link
            href="/admin/quotations"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:border-gold"
          >
            <FileText size={16} />
            View Quotations ({stats.quotationCount})
          </Link>
          <Link
            href="/admin/inquiries"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:border-gold"
          >
            <Mail size={16} />
            Contact Messages ({stats.inquiryCount})
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:border-gold"
          >
            Change Password
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-gray-200 bg-white p-6 transition-all hover:border-gold hover:shadow-lg"
          >
            <card.icon size={24} className="text-gold" />
            <p className="mt-4 font-serif text-3xl font-semibold">{card.value}</p>
            <p className="text-sm text-gray-medium">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

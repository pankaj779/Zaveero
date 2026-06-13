import { requireAdmin } from "@/lib/admin-auth";
import { getInquiries } from "@/lib/inquiries";
import { Mail } from "lucide-react";

type Inquiry = Awaited<ReturnType<typeof getInquiries>>[number];

export default async function AdminInquiriesPage() {
  await requireAdmin();

  const inquiries: Inquiry[] = await getInquiries();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">
        Contact Inquiries
      </h1>
      <p className="mt-1 text-sm text-gray-medium">
        All messages from the contact form are saved here — even if email is not configured.
      </p>

      <div className="mt-8 space-y-4">
        {inquiries.length === 0 ? (
          <p className="text-sm text-gray-medium">No inquiries yet.</p>
        ) : (
          inquiries.map((item) => (
            <div key={item.id} className="border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-black">{item.name}</p>
                  <p className="text-sm text-gray-medium">{item.service}</p>
                </div>
                <div className="text-right text-xs text-gray-medium">
                  <p>{new Date(item.createdAt).toLocaleString("en-IN")}</p>
                  {item.emailed ? (
                    <span className="text-green-600">Email sent</span>
                  ) : (
                    <span className="text-amber-600">Saved only (email not sent)</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <a href={`mailto:${item.email}`} className="flex items-center gap-1 text-gold hover:underline">
                  <Mail size={14} /> {item.email}
                </a>
                <a href={`tel:${item.phone}`} className="hover:text-gold">
                  {item.phone}
                </a>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-charcoal">{item.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/admin-auth";
import { getQuotations } from "@/lib/quotations";
import { formatCurrency } from "@/lib/utils";
import { Mail, Phone } from "lucide-react";

export default async function AdminQuotationsPage() {
  await requireAdmin();

  const quotations = await getQuotations();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">Guest Quotations</h1>
      <p className="mt-1 text-sm text-gray-medium">
        Quotation requests submitted from the public Get Quote form.
      </p>

      <div className="mt-8 space-y-6">
        {quotations.length === 0 ? (
          <p className="text-sm text-gray-medium">No quotations yet.</p>
        ) : (
          quotations.map((quote) => (
            <div key={quote.id} className="border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                    {quote.referenceCode}
                  </p>
                  <p className="mt-1 font-semibold text-black">{quote.projectTitle}</p>
                  <p className="text-sm text-gray-medium">
                    {quote.serviceType} — {quote.location}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-medium">
                  <p>{new Date(quote.createdAt).toLocaleString("en-IN")}</p>
                  <p className="capitalize">Status: {quote.status}</p>
                  {quote.emailed ? (
                    <span className="text-green-600">Email sent</span>
                  ) : (
                    <span className="text-amber-600">Saved only (email not sent)</span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="font-medium">{quote.clientName}</span>
                {quote.clientEmail && (
                  <a
                    href={`mailto:${quote.clientEmail}`}
                    className="flex items-center gap-1 text-gold hover:underline"
                  >
                    <Mail size={14} /> {quote.clientEmail}
                  </a>
                )}
                <a
                  href={`tel:${quote.clientPhone}`}
                  className="flex items-center gap-1 hover:text-gold"
                >
                  <Phone size={14} /> {quote.clientPhone}
                </a>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-charcoal">{quote.description}</p>

              {quote.items.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-medium">
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Rate</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-3 py-2">{item.itemName}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{formatCurrency(item.rate)}</td>
                          <td className="px-3 py-2 text-gray-medium">{item.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

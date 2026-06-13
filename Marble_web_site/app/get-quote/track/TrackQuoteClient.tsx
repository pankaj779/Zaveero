"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type QuotationResult = {
  referenceCode: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  projectTitle: string;
  location: string;
  serviceType: string;
  description: string;
  status: string;
  createdAt: string;
  items: {
    id: string;
    itemName: string;
    unit: string;
    quantity: number;
    rate: number;
    notes: string;
  }[];
};

export function TrackQuoteClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [referenceCode, setReferenceCode] = useState(searchParams.get("ref") ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quotation, setQuotation] = useState<QuotationResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setQuotation(null);

    try {
      const params = new URLSearchParams({
        referenceCode: referenceCode.trim(),
        phone: phone.trim(),
      });
      const res = await fetch(`/api/quotations/lookup?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setQuotation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  const total =
    quotation?.items.reduce((sum, item) => sum + item.quantity * item.rate, 0) ?? 0;

  return (
    <>
      <Header standalone />
      <main className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <h1 className="font-serif text-3xl font-semibold text-black">{t.trackQuote.title}</h1>
          <p className="mt-2 text-sm text-gray-medium">{t.trackQuote.description}</p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 border border-gray-200 bg-white p-6 md:p-8"
          >
            <Input
              label={t.trackQuote.referenceCode}
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
              required
              placeholder="SSA-2026-0001"
            />
            <Input
              label={t.trackQuote.phone}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder={t.getQuote.phonePlaceholder}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="primary" className="w-full min-h-12" disabled={loading}>
              {loading ? t.trackQuote.searching : t.trackQuote.search}
            </Button>
          </form>

          {quotation && (
            <div className="mt-8 border border-gray-200 bg-white p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gold">{quotation.referenceCode}</p>
                  <h2 className="mt-1 font-serif text-2xl text-black">{quotation.projectTitle}</h2>
                  <p className="text-sm text-gray-medium">
                    {quotation.serviceType} — {quotation.location}
                  </p>
                </div>
                <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-medium uppercase text-gold-dark">
                  {quotation.status}
                </span>
              </div>

              <p className="mt-4 text-sm text-gray-medium">
                {t.trackQuote.submitted}:{" "}
                {new Date(quotation.createdAt).toLocaleString("en-IN")}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-charcoal">{quotation.description}</p>

              {quotation.items.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-medium">
                        <th className="px-3 py-2">{t.getQuote.itemName}</th>
                        <th className="px-3 py-2">{t.getQuote.unit}</th>
                        <th className="px-3 py-2">{t.getQuote.quantity}</th>
                        <th className="px-3 py-2">{t.getQuote.rate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-3 py-2">{item.itemName}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{formatCurrency(item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-4 text-right font-semibold text-gold-dark">
                    {t.getQuote.estimatedTotal}: {formatCurrency(total)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

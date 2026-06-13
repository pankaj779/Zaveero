"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLanguage } from "@/contexts/LanguageContext";
import { COMPANY, QUOTE_SERVICE_TYPES } from "@/lib/constants";
import type { PricingItemRecord, QuotationItemInput } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const UNITS = ["SFT", "RFT", "SQM", "Nos"];

type PricingProps = {
  pricingItems: PricingItemRecord[];
};

const emptyItem = (): QuotationItemInput => ({
  itemName: "",
  unit: "SFT",
  quantity: 1,
  rate: 0,
  notes: "",
});

export function GetQuote({ pricingItems }: PricingProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    referenceCode: string;
    clientEmailed: boolean;
    clientEmail: string;
  } | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [location, setLocation] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<QuotationItemInput[]>([emptyItem()]);

  const quickAddItems = useMemo(
    () => pricingItems.slice(0, 12),
    [pricingItems]
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [items]
  );

  function updateItem(index: number, field: keyof QuotationItemInput, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addFromRateCard(item: PricingItemRecord) {
    setItems((prev) => [
      ...prev.filter((i) => i.itemName.trim()),
      {
        itemName: item.itemName,
        unit: item.unit,
        quantity: 1,
        rate: item.rate,
        notes: "",
      },
    ]);
  }

  function validateStep(current: number) {
    if (current === 1) {
      if (!clientName.trim() || !clientPhone.trim() || !location.trim()) {
        setError(t.getQuote.step1Error);
        return false;
      }
    }
    if (current === 2) {
      if (!projectTitle.trim() || !description.trim()) {
        setError(t.getQuote.step2Error);
        return false;
      }
      if (serviceTypes.length === 0) {
        setError(t.getQuote.serviceTypeError);
        return false;
      }
    }
    setError("");
    return true;
  }

  function goNext() {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validItems = items.filter((item) => item.itemName.trim());
    if (validItems.length === 0) {
      setError(t.getQuote.itemsError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientEmail: clientEmail.trim() || undefined,
          projectTitle,
          location,
          serviceType: serviceTypes.join(", "),
          description,
          items: validItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");

      setSuccess({
        referenceCode: data.referenceCode,
        clientEmailed: data.clientEmailed,
        clientEmail: clientEmail.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quotation");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <section id="get-quote" className="bg-gray-50 py-24 md:py-32">
        <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{t.getQuote.successTitle}</p>
            <p className="mt-6 font-serif text-4xl font-semibold tracking-wide text-black md:text-5xl">
              {success.referenceCode}
            </p>
            <p className="mt-4 text-sm text-gray-medium">{t.getQuote.saveReference}</p>
            {success.clientEmailed && success.clientEmail && (
              <p className="mt-2 text-sm text-green-700">
                {t.getQuote.emailSent.replace("{email}", success.clientEmail)}
              </p>
            )}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/get-quote/track?ref=${encodeURIComponent(success.referenceCode)}`}>
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  {t.getQuote.trackThis}
                </Button>
              </Link>
              <a href={COMPANY.phoneTel}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Phone size={16} className="mr-2" />
                  {t.getQuote.callUs}
                </Button>
              </a>
              <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t.getQuote.whatsappUs}
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    );
  }

  return (
    <section id="get-quote" className="bg-gray-50 py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.getQuote.subtitle}
          title={t.getQuote.title}
          description={t.getQuote.description}
        />

        <FadeIn>
          <div className="mb-8 flex items-center justify-center gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                    step === n
                      ? "bg-gold text-black"
                      : step > n
                        ? "bg-charcoal text-white"
                        : "border border-gray-300 bg-white text-gray-medium"
                  )}
                >
                  {n}
                </div>
                {n < 3 && (
                  <div
                    className={cn(
                      "hidden h-0.5 w-8 sm:block",
                      step > n ? "bg-charcoal" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mb-8 text-center text-sm text-gray-medium">
            {step === 1 && t.getQuote.step1Label}
            {step === 2 && t.getQuote.step2Label}
            {step === 3 && t.getQuote.step3Label}
          </p>

          <form
            onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}
            className="border border-gray-200 bg-white p-6 md:p-10"
          >
            {step === 1 && (
              <div className="space-y-5">
                <Input
                  label={t.getQuote.name}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder={t.getQuote.namePlaceholder}
                />
                <Input
                  label={t.getQuote.phone}
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                  placeholder={t.getQuote.phonePlaceholder}
                />
                <Input
                  label={t.getQuote.emailOptional}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder={t.getQuote.emailPlaceholder}
                />
                <Input
                  label={t.getQuote.location}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder={t.getQuote.locationPlaceholder}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <Input
                  label={t.getQuote.projectTitle}
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                  placeholder={t.getQuote.projectPlaceholder}
                />
                <div>
                  <p className="mb-2 block text-sm font-medium text-charcoal">
                    {t.getQuote.serviceType}
                  </p>
                  <p className="mb-3 text-xs text-gray-medium">{t.getQuote.serviceTypeHint}</p>
                  <div className="flex flex-wrap gap-2">
                    {QUOTE_SERVICE_TYPES.map((type) => {
                      const selected = serviceTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setServiceTypes((prev) =>
                              selected ? prev.filter((t) => t !== type) : [...prev, type]
                            )
                          }
                          className={cn(
                            "min-h-12 rounded-full border px-5 py-2.5 text-sm font-medium transition",
                            selected
                              ? "border-gold bg-gold text-black"
                              : "border-gray-300 bg-white text-charcoal hover:border-gold"
                          )}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Textarea
                  label={t.getQuote.workDescription}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  placeholder={t.getQuote.descriptionPlaceholder}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {quickAddItems.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs uppercase tracking-wider text-gray-medium">
                      {t.getQuote.quickAdd}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickAddItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addFromRateCard(item)}
                          className="rounded-full border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-charcoal transition hover:bg-gold/20"
                        >
                          + {item.itemName} ({formatCurrency(item.rate)}/{item.unit})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-3 border border-gray-100 bg-gray-50/50 p-4 md:grid-cols-12"
                    >
                      <div className="md:col-span-4">
                        <Input
                          label={t.getQuote.itemName}
                          value={item.itemName}
                          onChange={(e) => updateItem(index, "itemName", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Select
                          label={t.getQuote.unit}
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          options={UNITS}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label={t.getQuote.quantity}
                          type="number"
                          min={0}
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label={t.getQuote.rate}
                          type="number"
                          min={0}
                          step="any"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(index, "rate", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="flex items-end md:col-span-2">
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) =>
                              prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
                            )
                          }
                          className="flex h-12 w-12 items-center justify-center text-gray-medium hover:text-red-500"
                          aria-label="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                  className="w-full min-h-12"
                >
                  <Plus size={18} className="mr-2" />
                  {t.getQuote.addItem}
                </Button>

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <span className="text-sm font-medium text-charcoal">{t.getQuote.estimatedTotal}</span>
                  <span className="font-serif text-xl font-semibold text-gold-dark">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <div className="sticky bottom-0 mt-8 flex gap-3 border-t border-gray-100 bg-white pt-6">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={goBack} className="min-h-12 flex-1">
                  {t.getQuote.back}
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" variant="primary" onClick={goNext} className="min-h-12 flex-1">
                  {t.getQuote.next}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="min-h-12 flex-1"
                >
                  {loading ? t.getQuote.submitting : t.getQuote.submit}
                </Button>
              )}
            </div>
          </form>
        </FadeIn>
      </div>
    </section>
  );
}

"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tabs } from "@/components/ui/Tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { PRICING_CATEGORIES } from "@/lib/constants";
import type { PricingItemRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useMemo, useState } from "react";

type PricingProps = {
  items: PricingItemRecord[];
};

export function Pricing({ items }: PricingProps) {
  const { t } = useLanguage();
  const [materialTab, setMaterialTab] = useState("with_material");

  const categoryLabels: Record<string, string> = {
    marble: t.pricing.marble,
    granite: t.pricing.granite,
    tile: t.pricing.tile,
  };

  const tabs = [
    { value: "with_material", label: t.pricing.withMaterial },
    { value: "without_material", label: t.pricing.withoutMaterial },
  ];

  const grouped = useMemo(() => {
    const filtered = items.filter((i) => i.materialType === materialTab);
    return PRICING_CATEGORIES.map((cat) => ({
      ...cat,
      label: categoryLabels[cat.value] ?? cat.label,
      items: filtered.filter((i) => i.category === cat.value),
    }));
  }, [items, materialTab, categoryLabels]);

  return (
    <section id="pricing" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.pricing.subtitle}
          title={t.pricing.title}
          description={t.pricing.description}
        />

        <FadeIn>
          <Tabs
            tabs={tabs}
            value={materialTab}
            onChange={setMaterialTab}
            className="mb-12 justify-center"
          />
        </FadeIn>

        <div className="space-y-10">
          {grouped.map((group, gi) => (
            <FadeIn key={group.value} delay={gi * 0.1}>
              <div className="border border-gray-200">
                <div className="border-b border-gray-200 bg-charcoal px-6 py-4">
                  <h3 className="font-serif text-lg font-semibold text-white">
                    {group.label}
                  </h3>
                </div>

                {group.items.length === 0 ? (
                  <p className="p-6 text-sm text-gray-medium">{t.pricing.empty}</p>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                              {t.pricing.itemName}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                              {t.pricing.unit}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-charcoal">
                              {t.pricing.rate}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item, i) => (
                            <tr
                              key={item.id}
                              className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                            >
                              <td className="px-6 py-4 text-sm text-black">
                                {item.itemName}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-medium">
                                {item.unit}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-semibold text-gold-dark">
                                {formatCurrency(item.rate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-gray-200 md:hidden">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-black">
                              {item.itemName}
                            </p>
                            <p className="text-xs text-gray-medium">{item.unit}</p>
                          </div>
                          <p className="text-sm font-semibold text-gold-dark">
                            {formatCurrency(item.rate)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </FadeIn>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-medium">
          {t.pricing.disclaimer}
        </p>
        <p className="mt-3 text-center text-sm text-charcoal">
          {t.pricing.quoteNote}{" "}
          <a href="#get-quote" className="font-medium text-gold hover:underline">
            {t.pricing.quoteLink}
          </a>
        </p>
      </div>
    </section>
  );
}

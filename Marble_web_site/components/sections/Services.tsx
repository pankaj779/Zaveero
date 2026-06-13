"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SERVICES } from "@/lib/constants";
import {
  ArrowUpRight,
  Bath,
  Building2,
  ChefHat,
  Footprints,
  Grid3x3,
  Hammer,
  Layers,
  LayoutGrid,
  PanelTop,
  Square,
  type LucideIcon,
} from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";

const ICON_MAP: Record<string, LucideIcon> = {
  Layers,
  LayoutGrid,
  ArrowUpRight,
  Square,
  Hammer,
  ChefHat,
  Grid3x3,
  Footprints,
  PanelTop,
  Bath,
  Building2,
};

export function Services() {
  return (
    <section id="services" className="bg-charcoal py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="Our Services"
          title="Comprehensive Stone & Tile Solutions"
          description="From luxury marble flooring to precision tile fixing, we deliver end-to-end contracting services for residential and commercial projects."
          light
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, index) => {
            const Icon = ICON_MAP[service.icon] ?? Layers;
            return (
              <FadeIn key={service.title} delay={index * 0.05}>
                <div className="group relative overflow-hidden border border-gray-700 bg-black/40 transition-all duration-500 hover:border-gold">
                  <div className="relative h-48 overflow-hidden">
                    <SafeImage
                      src={service.image}
                      alt={service.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>
                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <Icon size={20} className="text-gold" />
                      <h3 className="font-serif text-lg font-semibold text-white">
                        {service.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                      {service.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SafeImage } from "@/components/ui/SafeImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { COMPANY, STATS } from "@/lib/constants";
import { STONE_IMAGES } from "@/lib/images";

export function About() {
  const { t } = useLanguage();

  const stats = [
    { value: "30+", label: t.about.stats.experience },
    { value: "6000+", label: t.about.stats.projects },
    { value: "500+", label: t.about.stats.clients },
    { value: "100%", label: t.about.stats.satisfaction },
  ];

  return (
    <section id="about" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.about.subtitle}
          title={t.about.title}
          description={t.about.description}
        />

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn direction="left">
            <div className="relative aspect-[4/5] overflow-hidden">
              <SafeImage
                src={STONE_IMAGES.stoneCraft}
                alt="Stone craftsmanship at work"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 border border-gold/30" />
              <div className="absolute -bottom-4 -right-4 h-full w-full border border-gold/20" />
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.2}>
            <div>
              <h3 className="font-serif text-2xl font-semibold text-black md:text-3xl">
                {COMPANY.owner}
              </h3>
              <p className="mt-1 text-sm uppercase tracking-widest text-gold">
                {t.about.founder}
              </p>
              <p className="mt-6 text-base leading-relaxed text-gray-medium">
                {t.about.p1}
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-medium">
                {t.about.p2}
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center sm:text-left">
                    <p className="font-serif text-3xl font-semibold text-gold md:text-4xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-gray-medium">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

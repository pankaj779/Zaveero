"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLanguage } from "@/contexts/LanguageContext";
import { PROJECT_CATEGORIES } from "@/lib/constants";
import type { ProjectRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapPin, Play, X } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { useCallback, useEffect, useState } from "react";

type PortfolioProps = {
  projects: ProjectRecord[];
};

export function Portfolio({ projects }: PortfolioProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ProjectRecord | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered =
    filter === "all"
      ? projects
      : projects.filter((p) => p.category === filter);

  const closeModal = useCallback(() => {
    setSelected(null);
    setLightboxIndex(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (lightboxIndex !== null && selected) {
        if (e.key === "ArrowRight") {
          setLightboxIndex((i) =>
            i !== null ? Math.min(i + 1, selected.photos.length - 1) : null
          );
        }
        if (e.key === "ArrowLeft") {
          setLightboxIndex((i) => (i !== null ? Math.max(i - 1, 0) : null));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal, lightboxIndex, selected]);

  return (
    <section id="portfolio" className="bg-black py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.portfolio.subtitle}
          title={t.portfolio.title}
          description={t.portfolio.description}
          light
        />

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {PROJECT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFilter(cat.value)}
              className={cn(
                "px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all",
                filter === cat.value
                  ? "bg-gold text-black"
                  : "border border-gray-700 text-gray-400 hover:border-gold hover:text-gold"
              )}
            >
              {t.categories[cat.value as keyof typeof t.categories]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-500">{t.portfolio.empty}</div>
        ) : (
          <div className="masonry-grid">
            {filtered.map((project, index) => {
              const cover = project.photos[0];
              return (
                <FadeIn key={project.id} delay={index * 0.05}>
                  <button
                    type="button"
                    onClick={() => setSelected(project)}
                    className="masonry-item group w-full cursor-pointer overflow-hidden border border-gray-800 text-left transition-all hover:border-gold"
                  >
                    {cover && (
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <SafeImage
                          src={cover}
                          alt={project.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform group-hover:translate-y-0">
                          <p className="text-xs uppercase tracking-wider text-gold">
                            {project.category}
                          </p>
                          <h3 className="font-serif text-lg text-white">
                            {project.name}
                          </h3>
                        </div>
                      </div>
                    )}
                  </button>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/90 p-4 md:p-8">
          <div className="relative w-full max-w-5xl bg-charcoal">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 z-10 text-white hover:text-gold"
              aria-label="Close"
            >
              <X size={28} />
            </button>

            <div className="p-6 md:p-10">
              <p className="text-xs uppercase tracking-[0.2em] text-gold">
                {selected.category}
              </p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white md:text-3xl">
                {selected.name}
              </h3>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-400">
                <span>{t.portfolio.client}: {selected.clientName}</span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-gold" />
                  {selected.location}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-300">
                {selected.description}
              </p>

              {selected.photos.length > 0 && (
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selected.photos.map((photo, i) => (
                    <button
                      key={photo}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="relative aspect-[4/3] overflow-hidden"
                    >
                      <SafeImage
                        src={photo}
                        alt={`${selected.name} photo ${i + 1}`}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                        sizes="300px"
                      />
                    </button>
                  ))}
                </div>
              )}

              {selected.videos.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-gold">
                    <Play size={16} /> {t.portfolio.videos}
                  </h4>
                  {selected.videos.map((video) => (
                    <video
                      key={video}
                      src={video}
                      controls
                      className="w-full"
                      preload="metadata"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && lightboxIndex !== null && selected.photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 text-white hover:text-gold"
            aria-label="Close lightbox"
          >
            <X size={28} />
          </button>
          <div className="relative h-[80vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <SafeImage
              src={selected.photos[lightboxIndex]}
              alt="Project photo"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </section>
  );
}

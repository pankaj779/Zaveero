"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { Input, Textarea } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TestimonialRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Quote, Star } from "lucide-react";
import { FormEvent, useState } from "react";

type TestimonialsProps = {
  testimonials: TestimonialRecord[];
};

export function Testimonials({ testimonials }: TestimonialsProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, quote, rating }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");

      setSuccess(data.message ?? t.testimonials.submitSuccess);
      setName("");
      setRole("");
      setQuote("");
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setLoading(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <section id="testimonials" className="bg-charcoal py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.testimonials.subtitle}
          title={t.testimonials.title}
          description={t.testimonials.description}
          light
        />

        {testimonials.length > 0 && (
          <div className="mb-16 grid gap-6 md:grid-cols-2">
            {testimonials.map((item, index) => (
              <FadeIn key={item.id} delay={index * 0.1}>
                <div className="relative border border-gray-700 bg-black/30 p-8">
                  <Quote size={32} className="absolute right-6 top-6 text-gold/20" />
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} size={14} className="fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300 italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div className="mt-6 border-t border-gray-700 pt-4">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-gold">{item.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}

        <FadeIn>
          <div className="mx-auto max-w-2xl border border-gray-700 bg-black/40 p-6 md:p-8">
            <h3 className="font-serif text-xl text-white">{t.testimonials.leaveReview}</h3>
            <p className="mt-2 text-sm text-gray-400">{t.testimonials.leaveReviewHint}</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-white">{t.testimonials.yourRating}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(value)}
                      className="min-h-12 min-w-12 p-2"
                      aria-label={`${value} stars`}
                    >
                      <Star
                        size={28}
                        className={cn(
                          value <= displayRating ? "fill-gold text-gold" : "text-gray-600"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label={t.testimonials.yourName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t.testimonials.namePlaceholder}
                className="border-gray-600 bg-black/50 text-white"
              />
              <Input
                label={t.testimonials.yourRole}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t.testimonials.rolePlaceholder}
                className="border-gray-600 bg-black/50 text-white"
              />
              <Textarea
                label={t.testimonials.yourReview}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                required
                rows={4}
                placeholder={t.testimonials.reviewPlaceholder}
                className="border-gray-600 bg-black/50 text-white"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">{success}</p>}

              <Button
                type="submit"
                variant="primary"
                className="w-full min-h-12"
                disabled={loading}
              >
                {loading ? t.testimonials.submitting : t.testimonials.submitReview}
              </Button>
            </form>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

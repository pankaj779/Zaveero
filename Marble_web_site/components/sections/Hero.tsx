"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { SafeImage } from "@/components/ui/SafeImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { STONE_IMAGES } from "@/lib/images";
import { motion } from "framer-motion";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative flex min-h-screen items-center overflow-hidden">
      <div className="absolute inset-0">
        <SafeImage
          src={STONE_IMAGES.hero}
          alt="Premium marble flooring"
          fill
          priority
          className="animate-ken-burns object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 md:px-8">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-xs font-medium uppercase tracking-[0.4em] text-gold"
          >
            {t.hero.tagline}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl font-semibold leading-tight text-white md:text-6xl lg:text-7xl"
          >
            {t.hero.title1}
            <br />
            <span className="text-gold">{t.hero.title2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-gray-300 md:text-lg"
          >
            {t.hero.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <a href="#portfolio">
              <Button variant="primary" size="lg">
                {t.hero.viewProjects}
              </Button>
            </a>
            <a href="#contact">
              <Button variant="outline" size="lg">
                {t.hero.contactUs}
              </Button>
            </a>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <FadeIn delay={0.8}>
          <a
            href="#about"
            className="flex flex-col items-center gap-2 text-xs uppercase tracking-widest text-white/60 hover:text-gold"
          >
            <span>{t.hero.scroll}</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="h-8 w-px bg-gold"
            />
          </a>
        </FadeIn>
      </div>
    </section>
  );
}

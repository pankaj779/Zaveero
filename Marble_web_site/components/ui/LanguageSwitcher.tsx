"use client";

import { LOCALES } from "@/lib/i18n/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  light?: boolean;
};

export function LanguageSwitcher({ light = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      <Globe size={14} className={light ? "text-white/70" : "text-gray-medium"} />
      {LOCALES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLocale(lang.code)}
          className={cn(
            "px-2 py-1 text-xs font-medium transition-colors",
            locale === lang.code
              ? "bg-gold text-black"
              : light
                ? "text-white/80 hover:text-gold"
                : "text-charcoal hover:text-gold"
          )}
          title={lang.label}
        >
          {lang.native}
        </button>
      ))}
    </div>
  );
}

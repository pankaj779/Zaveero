"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

type Tab = {
  value: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function Tabs({ tabs, defaultValue, value, onChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = value ?? internal;

  const handleChange = (next: string) => {
    setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => handleChange(tab.value)}
          className={cn(
            "px-5 py-2.5 text-sm font-medium tracking-wide transition-all duration-300",
            active === tab.value
              ? "bg-gold text-black"
              : "border border-gray-300 text-charcoal hover:border-gold hover:text-gold"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

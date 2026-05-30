import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
};

const sizes = {
  sm: { box: "h-8 w-8", text: "text-base", tag: "text-[9px]" },
  md: { box: "h-10 w-10", text: "text-xl", tag: "text-[10px]" },
  lg: { box: "h-12 w-12", text: "text-2xl", tag: "text-[11px]" },
};

/**
 * Zaavero constellation mark — crisp "Z" hub with dual orbiting rings.
 * SVG animateTransform keeps motion smooth without a client component.
 */
function Mark({ className, animated = true }: { className?: string; animated?: boolean }) {
  const spin = animated ? (
    <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="14s" repeatCount="indefinite" />
  ) : null;
  const spinReverse = animated ? (
    <animateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="20s" repeatCount="indefinite" />
  ) : null;
  const pulse = animated ? (
    <animate attributeName="opacity" values="0.85;1;0.85" dur="2.4s" repeatCount="indefinite" />
  ) : null;

  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="zv-bg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f766e" />
          <stop offset="0.45" stopColor="#0e7490" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <radialGradient id="zv-shine" cx="0.3" cy="0.25" r="0.65">
          <stop stopColor="white" stopOpacity="0.35" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="48" height="48" rx="13" fill="url(#zv-bg)" />
      <rect width="48" height="48" rx="13" fill="url(#zv-shine)" />

      {/* Outer orbit — three module nodes */}
      <g>{spin}
        <circle cx="24" cy="24" r="15.5" stroke="white" strokeOpacity="0.18" strokeWidth="0.75" strokeDasharray="2.5 3.5" fill="none" />
        <circle cx="24" cy="8.5" r="2.3" fill="#5eead4">{pulse}</circle>
        <circle cx="37.5" cy="30" r="1.9" fill="#c4b5fd" />
        <circle cx="10.5" cy="30" r="1.9" fill="#67e8f9" />
      </g>

      {/* Inner orbit — single satellite counter-rotation */}
      <g>{spinReverse}
        <circle cx="38" cy="24" r="1.4" fill="white" fillOpacity="0.75" />
      </g>

      {/* Bold Z — top bar, diagonal, bottom bar */}
      <path
        d="M13 16 H35 M35 16 L15 32 M15 32 H35"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hub nucleus */}
      <circle cx="24" cy="24" r="2.8" fill="white" fillOpacity="0.95">
        {pulse}
      </circle>
    </svg>
  );
}

export function Logo({ size = "md", showWordmark = true, animated = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          s.box,
          "relative shrink-0 overflow-hidden rounded-[0.7rem] shadow-lg shadow-teal-600/25 ring-1 ring-white/15"
        )}
      >
        <Mark className="h-full w-full" animated={animated} />
      </div>
      {showWordmark && (
        <div className="leading-none">
          <span className={cn("font-semibold tracking-tight text-[hsl(var(--foreground))]", s.text)}>
            {BRAND.name}
          </span>
          {size !== "sm" && (
            <span
              className={cn(
                "mt-0.5 block uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]",
                s.tag
              )}
            >
              {BRAND.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { Mark as LogoMark };

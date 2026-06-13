import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "icon";
  theme?: "light" | "dark";
  className?: string;
};

export function Logo({ variant = "full", theme = "dark", className }: LogoProps) {
  const textColor = theme === "light" ? "#FFFFFF" : "#0A0A0A";
  const goldColor = "#C9A962";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 shrink-0"
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="4" fill={theme === "light" ? "#1A1A1A" : "#0A0A0A"} />
        <path
          d="M8 32 L18 12 L28 12 L38 32 Z"
          fill="none"
          stroke={goldColor}
          strokeWidth="1.5"
        />
        <path
          d="M14 32 L22 16 L30 16 L34 32 Z"
          fill={goldColor}
          fillOpacity="0.15"
          stroke={goldColor}
          strokeWidth="1"
        />
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fill={goldColor}
          fontSize="9"
          fontWeight="700"
          fontFamily="Georgia, serif"
          letterSpacing="1"
        >
          SSA
        </text>
      </svg>
      {variant === "full" && (
        <div className="flex flex-col leading-tight">
          <span
            className="font-serif text-lg font-semibold tracking-wide"
            style={{ color: textColor }}
          >
            Sanjana Stone Arts
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: goldColor }}
          >
            Premium Stone Craftsmanship
          </span>
        </div>
      )}
    </div>
  );
}

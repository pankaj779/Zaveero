import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  subtitle?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
};

export function SectionHeading({
  subtitle,
  title,
  description,
  align = "center",
  light = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {subtitle && (
        <p
          className={cn(
            "mb-3 text-xs font-medium uppercase tracking-[0.3em]",
            light ? "text-gold" : "text-gold-dark"
          )}
        >
          {subtitle}
        </p>
      )}
      <h2
        className={cn(
          "font-serif text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl",
          light ? "text-white" : "text-black"
        )}
      >
        {title}
      </h2>
      <div
        className={cn(
          "mt-4 h-px w-16 bg-gold",
          align === "center" && "mx-auto"
        )}
      />
      {description && (
        <p
          className={cn(
            "mt-6 text-base leading-relaxed md:text-lg",
            light ? "text-gray-300" : "text-gray-medium"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
        variant === "secondary" && "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
        variant === "outline" && "border border-[hsl(var(--border))]",
        variant === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        variant === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className
      )}
      {...props}
    />
  );
}

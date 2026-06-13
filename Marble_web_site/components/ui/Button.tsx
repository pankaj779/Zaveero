import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-gold text-black hover:bg-gold-dark border border-gold",
      secondary:
        "bg-charcoal text-white hover:bg-black border border-charcoal",
      outline:
        "bg-transparent text-white border border-gold hover:bg-gold hover:text-black",
      ghost:
        "bg-transparent text-charcoal hover:text-gold border border-transparent",
    };

    const sizes = {
      sm: "px-4 py-2 text-xs tracking-wider",
      md: "px-6 py-3 text-sm tracking-wider",
      lg: "px-8 py-4 text-sm tracking-widest uppercase",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

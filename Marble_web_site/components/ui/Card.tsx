import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "border border-gray-200 bg-white p-6",
        hover && "transition-all duration-300 hover:border-gold hover:shadow-lg hover:shadow-gold/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

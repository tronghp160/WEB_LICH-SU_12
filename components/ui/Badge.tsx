import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "accent" | "gold" | "muted" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  accent: "bg-accent text-accent-foreground",
  gold: "bg-gold text-gold-foreground",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "muted", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

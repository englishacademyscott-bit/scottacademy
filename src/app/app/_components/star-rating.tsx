import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  size = "sm",
  showValue = true,
  className,
}: {
  rating: number;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const sizes = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-5 w-5" };
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`Nota ${rating.toFixed(1).replace(".", ",")} de 5`}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = index < full || (index === full && half);
          return (
            <Star
              key={index}
              className={cn(
                sizes[size],
                filled ? "fill-sun-400 text-sun-500" : "text-ink-300 dark:text-ink-700",
              )}
              aria-hidden
            />
          );
        })}
      </span>
      {showValue ? (
        <span className="text-sm font-semibold tabular-nums text-default">
          {rating > 0 ? rating.toFixed(1).replace(".", ",") : "—"}
        </span>
      ) : null}
    </span>
  );
}

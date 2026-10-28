import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "gradient-brand text-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_6px_20px_-6px_rgba(79,70,229,0.7)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.3)_inset,0_10px_28px_-6px_rgba(79,70,229,0.8)]",
        secondary:
          "bg-surface text-default border border-default shadow-soft hover:bg-sunken hover:border-strong",
        ghost:
          "text-muted hover:bg-sunken hover:text-default",
        outline:
          "border border-brand-300 bg-transparent text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10",
        destructive:
          "bg-cherry-500 text-white hover:bg-cherry-600 shadow-[0_6px_20px_-8px_rgba(220,38,38,0.8)]",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_6px_20px_-8px_rgba(5,150,105,0.8)]",
        dark: "bg-ink-900 text-white hover:bg-ink-800",
        link: "text-brand-600 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

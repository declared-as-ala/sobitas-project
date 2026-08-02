import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium leading-snug tracking-normal transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",

        /*
         * `brand`, `brandOutline` and `brandGhost` were REMOVED here.
         *
         * They existed for one reason: `--primary` was near-black AND broken, so
         * `variant="default"` was not — could not be — the brand CTA. Both halves of that are
         * now false. `--primary` resolves to `--c-brand`, so `default` IS the brand CTA,
         * `outline` and `ghost` are its correct secondary and quiet forms, and a fourth,
         * fifth and sixth variant saying the same thing is how a component library rots.
         *
         * Removing them cost nothing: all three had ZERO usages anywhere in src/ — they were
         * added defensively and never adopted. Guarded by `tsc --noEmit`, since the cva
         * variant union is typed and any surviving call site would fail the build.
         */
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
        /** Primary calls-to-action. Meets the ≥44px tap-target rule (§10). */
        cta: "min-h-[44px] rounded-lg px-5 text-sm sm:text-base has-[>svg]:px-4",
        ctaLg: "min-h-[52px] rounded-lg px-6 text-sm sm:text-base has-[>svg]:px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

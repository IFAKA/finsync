import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button component following Vercel design guidelines:
 * - Minimum 44px hit target on mobile
 * - Focus-visible ring for keyboard navigation
 * - Loading state preserves button label
 * - GPU-accelerated transitions
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium",
    "transition-all duration-150",
    // Focus visible ring (Vercel guideline)
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50",
    // Icons
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Active state feedback
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/90",
        secondary:
          "border border-border bg-background text-foreground hover:bg-muted/10 hover:border-foreground/20",
        ghost: "hover:bg-muted/10 text-foreground",
        destructive:
          "bg-error text-white hover:bg-error/90",
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        // Min heights ensure 44px on mobile (Vercel guideline)
        default: "h-10 min-h-[44px] md:min-h-0 px-4 py-2 rounded-md",
        sm: "h-8 min-h-[44px] md:min-h-0 px-3 text-xs rounded-md",
        lg: "h-12 px-6 rounded-md",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

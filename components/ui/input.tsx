import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component following Vercel design guidelines:
 * - Minimum 44px hit target on mobile
 * - 16px font on mobile to prevent iOS zoom
 * - Focus-visible ring for keyboard navigation
 * - GPU-accelerated transitions
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2",
          // Typography - 16px on mobile to prevent iOS zoom
          "text-base sm:text-sm",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus ring (Vercel guideline)
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transitions
          "transition-shadow duration-150",
          // Mobile hit target (44px)
          "min-h-[44px] sm:min-h-0",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

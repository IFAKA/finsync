"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        secondary:
          "border border-border bg-background text-foreground hover:bg-muted/10 hover:border-foreground/20",
        ghost: "hover:bg-muted/10 text-foreground",
        destructive: "bg-error text-white hover:bg-error/90",
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto",
        success: "bg-success text-foreground hover:bg-success/90",
      },
      size: {
        default: "h-10 min-h-[44px] sm:min-h-0 px-4 py-2 rounded-md",
        sm: "h-8 min-h-[44px] sm:min-h-0 px-3 text-xs rounded-md",
        lg: "h-12 px-6 rounded-md",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type SoundType = "click" | "success" | "error" | "toggle" | "none";

export interface MotionButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
  sound?: SoundType;
  enableMotion?: boolean;
}

/**
 * MotionButton - Button with micro-interactions and sound feedback
 * Provides professional, tactile feedback for financial actions
 */
const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      sound = "click",
      enableMotion = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (sound !== "none") {
        playSound(sound);
      }
      onClick?.(e);
    };

    // For asChild, we can't use motion directly
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref as React.Ref<HTMLElement>}
          onClick={handleClick as unknown as React.MouseEventHandler<HTMLElement>}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        />
      );
    }

    if (!enableMotion) {
      return (
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={handleClick}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        />
      );
    }

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1, ease: [0.4, 0, 0.6, 1] }}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
MotionButton.displayName = "MotionButton";

interface IconButtonProps extends MotionButtonProps {
  label: string;
}

/**
 * IconButton - Animated icon button with accessibility label
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, sound = "click", ...props }, ref) => {
    return (
      <MotionButton
        ref={ref}
        size="icon"
        variant="ghost"
        sound={sound}
        aria-label={label}
        className={className}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";

export { MotionButton, IconButton, buttonVariants };

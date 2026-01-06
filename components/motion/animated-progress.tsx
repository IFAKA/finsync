"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showValue?: boolean;
  format?: "percent" | "value";
  onComplete?: () => void;
  enableSound?: boolean;
  height?: "sm" | "md" | "lg";
}

const heightClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

/**
 * AnimatedProgress - Smooth progress bar with spring animation
 * Changes color based on budget status (green -> yellow -> red)
 */
export function AnimatedProgress({
  value,
  max = 100,
  className,
  indicatorClassName,
  showValue = false,
  format = "percent",
  onComplete,
  enableSound = true,
  height = "sm",
}: AnimatedProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const percentage = Math.min((value / max) * 100, 100);

  const spring = useSpring(0, {
    stiffness: 50,
    damping: 15,
    mass: 1,
  });

  const width = useTransform(spring, (v) => `${v}%`);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        spring.set(percentage);

        // Play sound based on budget status
        if (enableSound && percentage >= 100) {
          playSound("warning");
        } else if (enableSound && percentage >= 80) {
          playSound("notification");
        }

        if (percentage >= 100 && onComplete) {
          onComplete();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isInView, percentage, spring, enableSound, onComplete]);

  // Update when value changes
  useEffect(() => {
    if (isInView) {
      spring.set(percentage);
    }
  }, [percentage, spring, isInView]);

  // Determine color based on percentage
  const getIndicatorColor = () => {
    if (percentage >= 100) return "bg-error";
    if (percentage >= 80) return "bg-warning";
    return "bg-success";
  };

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-border",
          heightClasses[height]
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            getIndicatorColor(),
            indicatorClassName
          )}
          style={{ width }}
        />
      </div>
      {showValue && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1 text-xs text-muted-foreground tabular-nums"
        >
          {format === "percent"
            ? `${Math.round(percentage)}%`
            : `${value} / ${max}`}
        </motion.span>
      )}
    </div>
  );
}

interface BudgetProgressProps {
  spent: number;
  budget: number;
  className?: string;
  showLabels?: boolean;
  currency?: string;
  locale?: string;
}

/**
 * BudgetProgress - Specialized progress for budget tracking
 * Includes labels and color-coded status
 */
export function BudgetProgress({
  spent,
  budget,
  className,
  showLabels = true,
  currency = "EUR",
  locale = "es-ES",
}: BudgetProgressProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;
  const isOverBudget = spent > budget;

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatedProgress
        value={spent}
        max={budget}
        height="md"
        enableSound={true}
      />
      {showLabels && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {formatAmount(spent)} spent
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "font-medium",
              isOverBudget ? "text-error" : "text-muted-foreground"
            )}
          >
            {isOverBudget
              ? `${formatAmount(Math.abs(remaining))} over`
              : `${formatAmount(remaining)} left`}
          </motion.span>
        </div>
      )}
    </div>
  );
}

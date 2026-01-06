"use client";

import { motion, SVGMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCheckProps extends SVGMotionProps<SVGSVGElement> {
  className?: string;
  size?: number;
  strokeWidth?: number;
  delay?: number;
}

/**
 * AnimatedCheck - Checkmark that draws itself
 * Use for success states, completed tasks
 */
export function AnimatedCheck({
  className,
  size = 24,
  strokeWidth = 2,
  delay = 0,
  ...props
}: AnimatedCheckProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-success", className)}
      {...props}
    >
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.1, delay },
        }}
      />
    </motion.svg>
  );
}

interface AnimatedXProps extends SVGMotionProps<SVGSVGElement> {
  className?: string;
  size?: number;
  strokeWidth?: number;
  delay?: number;
}

/**
 * AnimatedX - X mark that draws itself
 * Use for error states, closing, canceling
 */
export function AnimatedX({
  className,
  size = 24,
  strokeWidth = 2,
  delay = 0,
  ...props
}: AnimatedXProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-error", className)}
      {...props}
    >
      <motion.path
        d="M18 6L6 18"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.25, delay, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.1, delay },
        }}
      />
      <motion.path
        d="M6 6l12 12"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.25, delay: delay + 0.1, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.1, delay: delay + 0.1 },
        }}
      />
    </motion.svg>
  );
}

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

/**
 * LoadingSpinner - Smooth loading animation
 */
export function LoadingSpinner({ className, size = 20 }: LoadingSpinnerProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-muted-foreground", className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32 32"
        strokeDashoffset="0"
      />
    </motion.svg>
  );
}

interface AnimatedDotProps {
  className?: string;
  color?: string;
  size?: number;
  pulse?: boolean;
}

/**
 * AnimatedDot - Pulsing status indicator
 */
export function AnimatedDot({
  className,
  color = "bg-success",
  size = 8,
  pulse = true,
}: AnimatedDotProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      {pulse && (
        <motion.span
          className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", color)}
          animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className={cn("relative inline-flex rounded-full", color)}
        style={{ width: size, height: size }}
      />
    </span>
  );
}

interface AnimatedArrowProps {
  direction: "up" | "down" | "left" | "right";
  className?: string;
  size?: number;
  animate?: boolean;
}

/**
 * AnimatedArrow - Arrow with hover animation
 */
export function AnimatedArrow({
  direction,
  className,
  size = 16,
  animate = true,
}: AnimatedArrowProps) {
  const rotation = {
    up: -90,
    down: 90,
    left: 180,
    right: 0,
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ rotate: rotation[direction] }}
      className={className}
      whileHover={animate ? { x: direction === "right" ? 3 : direction === "left" ? -3 : 0 } : undefined}
      transition={{ duration: 0.15 }}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </motion.svg>
  );
}

interface MoneyIconProps {
  type: "income" | "expense";
  className?: string;
  size?: number;
  animate?: boolean;
}

/**
 * MoneyIcon - Animated money indicator for transactions
 */
export function MoneyIcon({ type, className, size = 20, animate = true }: MoneyIconProps) {
  const isIncome = type === "income";

  return (
    <motion.div
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        isIncome ? "bg-success/10 text-success" : "bg-error/10 text-error",
        className
      )}
      style={{ width: size + 8, height: size + 8 }}
      initial={animate ? { scale: 0, opacity: 0 } : undefined}
      animate={animate ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { y: isIncome ? 4 : -4, opacity: 0 } : undefined}
        animate={animate ? { y: 0, opacity: 1 } : undefined}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        {isIncome ? (
          <>
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </>
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="m5 12 7 7 7-7" />
          </>
        )}
      </motion.svg>
    </motion.div>
  );
}

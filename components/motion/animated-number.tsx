"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { numberCounterConfig } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: "currency" | "percent" | "number";
  currency?: string;
  locale?: string;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animateOnView?: boolean;
}

/**
 * AnimatedNumber - Smoothly animates between number values
 * Perfect for financial dashboards showing amounts, percentages
 */
export function AnimatedNumber({
  value,
  className,
  format = "currency",
  currency = "EUR",
  locale = "es-ES",
  duration = numberCounterConfig.duration,
  delay = numberCounterConfig.delay,
  prefix = "",
  suffix = "",
  decimals = 2,
  animateOnView = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(0, {
    mass: 1,
    stiffness: 75,
    damping: 15,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    if (format === "currency") {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(current);
    }

    if (format === "percent") {
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(current / 100);
    }

    return (
      prefix +
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(current) +
      suffix
    );
  });

  useEffect(() => {
    const shouldAnimate = animateOnView ? isInView : true;

    if (shouldAnimate && !hasAnimated) {
      const timer = setTimeout(() => {
        spring.set(value);
        setHasAnimated(true);
      }, delay * 1000);
      return () => clearTimeout(timer);
    } else if (hasAnimated) {
      spring.set(value);
    }
  }, [value, spring, isInView, animateOnView, delay, hasAnimated]);

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
    >
      {display}
    </motion.span>
  );
}

interface AnimatedDifferenceProps {
  value: number;
  previousValue: number;
  className?: string;
  currency?: string;
  locale?: string;
  showSign?: boolean;
}

/**
 * AnimatedDifference - Shows animated difference with color coding
 * Green for positive (income), Red for negative (expense)
 */
export function AnimatedDifference({
  value,
  previousValue,
  className,
  currency = "EUR",
  locale = "es-ES",
  showSign = true,
}: AnimatedDifferenceProps) {
  const difference = value - previousValue;
  const isPositive = difference >= 0;

  return (
    <motion.span
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "tabular-nums inline-flex items-center gap-1",
        isPositive ? "text-success" : "text-error",
        className
      )}
    >
      {showSign && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
        >
          {isPositive ? "+" : ""}
        </motion.span>
      )}
      <AnimatedNumber
        value={difference}
        format="currency"
        currency={currency}
        locale={locale}
        delay={0.1}
      />
    </motion.span>
  );
}

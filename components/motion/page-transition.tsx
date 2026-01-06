"use client";

import { motion } from "framer-motion";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
}

/**
 * FadeIn - Simple fade in animation with optional direction
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.35,
  direction = "up",
  distance = 12,
}: FadeInProps) {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  const initial = {
    opacity: 0,
    ...directionMap[direction],
  };

  return (
    <motion.div
      initial={initial}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration,
          delay,
          ease: [0.23, 1, 0.32, 1],
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

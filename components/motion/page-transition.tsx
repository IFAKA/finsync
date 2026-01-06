"use client";

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition - Wraps page content with entrance animation
 * Use at the top level of each page component
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SectionTransitionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * SectionTransition - For animating sections within a page
 */
export function SectionTransition({ children, className, delay = 0 }: SectionTransitionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          delay,
          ease: [0.23, 1, 0.32, 1],
        },
      }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

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

interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * ScaleIn - Scale up entrance animation
 */
export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.3,
          delay,
          ease: [0.4, 0, 0.2, 1],
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

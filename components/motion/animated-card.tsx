"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cardVariants, staggerContainer } from "@/lib/motion";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  enableHover?: boolean;
  enableSound?: boolean;
  delay?: number;
}

/**
 * AnimatedCard - A card with entrance animation and hover effects
 * Designed for finance dashboards with professional, subtle motion
 */
export function AnimatedCard({
  children,
  className,
  enableHover = true,
  enableSound = false, // Disabled by default - hover sounds are distracting
  delay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={enableHover ? "hover" : undefined}
      whileTap={enableHover ? "tap" : undefined}
      onHoverStart={() => enableSound && playSound("hover")}
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AnimatedCardGrid - Container that staggers card animations
 */
export function AnimatedCardGrid({ children, className }: AnimatedCardGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

/**
 * StaggerItem - Individual item in a staggered animation sequence
 */
export function StaggerItem({ children, className, index = 0, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 12 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.35,
            delay: index * 0.06,
            ease: [0.23, 1, 0.32, 1],
          },
        },
      }}
      initial="initial"
      animate="animate"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

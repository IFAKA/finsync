"use client";

import * as React from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { listItemVariants, staggerContainer } from "@/lib/motion";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AnimatedList - Container for animating list items with stagger effect
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.div>
  );
}

interface AnimatedListItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  enableHover?: boolean;
  enableSound?: boolean;
  index?: number;
  layoutId?: string;
}

/**
 * AnimatedListItem - Individual list item with entrance/exit animations
 * Perfect for transaction rows, rule items, etc.
 */
export function AnimatedListItem({
  children,
  className,
  enableHover = true,
  enableSound = false,
  index = 0,
  layoutId,
  ...props
}: AnimatedListItemProps) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      variants={{
        initial: { opacity: 0, x: -8 },
        animate: {
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.25,
            delay: index * 0.04,
            ease: [0.4, 0, 0.2, 1],
          },
        },
        exit: {
          opacity: 0,
          x: 8,
          transition: { duration: 0.15 },
        },
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={enableHover ? { backgroundColor: "rgba(136, 136, 136, 0.05)" } : undefined}
      onHoverStart={() => enableSound && playSound("hover")}
      className={cn("transition-colors", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedTableRowProps extends HTMLMotionProps<"tr"> {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

/**
 * AnimatedTableRow - For animating table rows (transactions, etc.)
 */
export function AnimatedTableRow({
  children,
  className,
  index = 0,
  ...props
}: AnimatedTableRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.2,
          delay: index * 0.03,
          ease: [0.4, 0, 0.2, 1],
        },
      }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className={cn("interactive-row", className)}
      {...props}
    >
      {children}
    </motion.tr>
  );
}

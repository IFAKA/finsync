"use client";

import { motion, HTMLMotionProps } from "framer-motion";

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

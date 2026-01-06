"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TargetIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const TargetIcon = forwardRef<HTMLDivElement, TargetIconProps>(
  ({ className, size = 20, animate = false, ...props }, ref) => {
    const controls = useAnimation();

    useEffect(() => {
      if (animate) {
        controls.start("animate");
      } else {
        controls.start("normal");
      }
    }, [animate, controls]);

    return (
      <div ref={ref} className={cn("flex items-center justify-center", className)} {...props}>
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer ring */}
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0.8, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0 },
              },
            }}
          />
          {/* Middle ring */}
          <motion.circle
            cx="12"
            cy="12"
            r="6"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0.6, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.1 },
              },
            }}
          />
          {/* Center dot */}
          <motion.circle
            cx="12"
            cy="12"
            r="2"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.2, type: "spring", stiffness: 400 },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

TargetIcon.displayName = "TargetIcon";

export { TargetIcon };

"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WifiIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const WifiIcon = forwardRef<HTMLDivElement, WifiIconProps>(
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
          {/* Outer arc */}
          <motion.path
            d="M5 12.55a11 11 0 0 1 14.08 0"
            initial="normal"
            animate={controls}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0 },
              },
            }}
          />
          {/* Middle arc */}
          <motion.path
            d="M8.53 16.11a6 6 0 0 1 6.95 0"
            initial="normal"
            animate={controls}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.15 },
              },
            }}
          />
          {/* Center dot */}
          <motion.line
            x1="12"
            y1="20"
            x2="12.01"
            y2="20"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.2, delay: 0.3, type: "spring", stiffness: 400 },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

WifiIcon.displayName = "WifiIcon";

export { WifiIcon };

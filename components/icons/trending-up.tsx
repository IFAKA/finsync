"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TrendingUpIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const TrendingUpIcon = forwardRef<HTMLDivElement, TrendingUpIconProps>(
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
          {/* Trend line */}
          <motion.polyline
            points="22 7 13.5 15.5 8.5 10.5 2 17"
            initial="normal"
            animate={controls}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0, 1],
                opacity: [0.3, 1],
                transition: { duration: 0.4, ease: "easeOut" },
              },
            }}
          />
          {/* Arrow head */}
          <motion.polyline
            points="16 7 22 7 22 13"
            initial="normal"
            animate={controls}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.2 },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

TrendingUpIcon.displayName = "TrendingUpIcon";

export { TrendingUpIcon };

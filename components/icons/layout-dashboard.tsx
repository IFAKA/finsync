"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LayoutDashboardIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const LayoutDashboardIcon = forwardRef<HTMLDivElement, LayoutDashboardIconProps>(
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
          {/* Top left - large panel */}
          <motion.rect
            x="3"
            y="3"
            width="7"
            height="9"
            rx="1"
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
          {/* Top right - small panel */}
          <motion.rect
            x="14"
            y="3"
            width="7"
            height="5"
            rx="1"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0.8, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.1 },
              },
            }}
          />
          {/* Bottom left - small panel */}
          <motion.rect
            x="3"
            y="16"
            width="7"
            height="5"
            rx="1"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0.8, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.2 },
              },
            }}
          />
          {/* Bottom right - large panel */}
          <motion.rect
            x="14"
            y="12"
            width="7"
            height="9"
            rx="1"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0.8, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.15 },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

LayoutDashboardIcon.displayName = "LayoutDashboardIcon";

export { LayoutDashboardIcon };

"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ArrowLeftRightIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const ArrowLeftRightIcon = forwardRef<HTMLDivElement, ArrowLeftRightIconProps>(
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
          {/* Left arrow */}
          <motion.g
            initial="normal"
            animate={controls}
            variants={{
              normal: { x: 0 },
              animate: {
                x: [-3, 0],
                transition: { type: "spring", stiffness: 300, damping: 20 },
              },
            }}
          >
            <path d="m8 7-4 5 4 5" />
          </motion.g>
          {/* Right arrow */}
          <motion.g
            initial="normal"
            animate={controls}
            variants={{
              normal: { x: 0 },
              animate: {
                x: [3, 0],
                transition: { type: "spring", stiffness: 300, damping: 20 },
              },
            }}
          >
            <path d="m16 7 4 5-4 5" />
          </motion.g>
          {/* Center line */}
          <motion.path
            d="M4 12h16"
            initial="normal"
            animate={controls}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, delay: 0.1 },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

ArrowLeftRightIcon.displayName = "ArrowLeftRightIcon";

export { ArrowLeftRightIcon };

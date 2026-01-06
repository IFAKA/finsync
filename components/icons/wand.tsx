"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WandIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const WandIcon = forwardRef<HTMLDivElement, WandIconProps>(
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
          {/* Wand */}
          <motion.path
            d="m15 4-9 9 3 3 9-9z"
            initial="normal"
            animate={controls}
            variants={{
              normal: { rotate: 0 },
              animate: {
                rotate: [0, -8],
                transition: { duration: 0.15, ease: "easeOut", repeatType: "reverse", repeat: 3 },
              },
            }}
            style={{ transformOrigin: "15px 4px" }}
          />
          {/* Sparkles */}
          <motion.path
            d="m18 13 2 2"
            initial="normal"
            animate={controls}
            variants={{
              normal: { opacity: 1, scale: 1 },
              animate: {
                opacity: [0, 1],
                scale: [0.5, 1],
                transition: { duration: 0.3, delay: 0.1, ease: "backOut" },
              },
            }}
          />
          <motion.path
            d="m13 18 2 2"
            initial="normal"
            animate={controls}
            variants={{
              normal: { opacity: 1, scale: 1 },
              animate: {
                opacity: [0, 1],
                scale: [0.5, 1],
                transition: { duration: 0.3, delay: 0.2, ease: "backOut" },
              },
            }}
          />
          <motion.path
            d="m20 9 2 2"
            initial="normal"
            animate={controls}
            variants={{
              normal: { opacity: 1, scale: 1 },
              animate: {
                opacity: [0, 1],
                scale: [0.5, 1],
                transition: { duration: 0.3, delay: 0.15, ease: "backOut" },
              },
            }}
          />
          <motion.path
            d="m9 20 2 2"
            initial="normal"
            animate={controls}
            variants={{
              normal: { opacity: 1, scale: 1 },
              animate: {
                opacity: [0, 1],
                scale: [0.5, 1],
                transition: { duration: 0.3, delay: 0.25, ease: "backOut" },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

WandIcon.displayName = "WandIcon";

export { WandIcon };

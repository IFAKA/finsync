"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SmartphoneIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
}

const SmartphoneIcon = forwardRef<HTMLDivElement, SmartphoneIconProps>(
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
          {/* Phone body */}
          <motion.rect
            x="5"
            y="2"
            width="14"
            height="20"
            rx="2"
            ry="2"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0.9, 1],
                opacity: [0, 1],
                transition: { duration: 0.3, type: "spring", stiffness: 300 },
              },
            }}
          />
          {/* Home button / notch */}
          <motion.line
            x1="12"
            y1="18"
            x2="12.01"
            y2="18"
            initial="normal"
            animate={controls}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.2, delay: 0.2 },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

SmartphoneIcon.displayName = "SmartphoneIcon";

export { SmartphoneIcon };

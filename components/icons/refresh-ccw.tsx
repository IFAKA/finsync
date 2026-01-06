"use client";

import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface RefreshCcwIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface RefreshCcwIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
  spinning?: boolean;
}

const RefreshCcwIcon = forwardRef<RefreshCcwIconHandle, RefreshCcwIconProps>(
  ({ className, size = 20, animate = false, spinning = false, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    useEffect(() => {
      if (spinning) {
        controls.start("spin");
      } else if (animate) {
        controls.start("animate");
      } else {
        controls.start("normal");
      }
    }, [animate, spinning, controls]);

    return (
      <div className={cn("flex items-center justify-center", className)} {...props}>
        <motion.svg
          initial="normal"
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          variants={{
            normal: { rotate: 0 },
            animate: { rotate: -45, transition: { type: "spring", stiffness: 250, damping: 25 } },
            spin: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: "linear" } },
          }}
        >
          <path d="M3 2v6h6" />
          <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
          <path d="M21 22v-6h-6" />
          <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
        </motion.svg>
      </div>
    );
  }
);

RefreshCcwIcon.displayName = "RefreshCcwIcon";

export { RefreshCcwIcon };

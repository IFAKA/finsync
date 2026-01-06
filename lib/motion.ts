/**
 * Motion Design System for Personal Finance App
 *
 * Design principles:
 * - Professional: Clean, precise movements
 * - Confident: Decisive animations, no wobble
 * - Functional: Motion serves purpose, not decoration
 */

import { Transition } from "framer-motion";

// Custom easing curves
export const easing = {
  sharp: [0.4, 0, 0.2, 1] as const,
  settle: [0.23, 1, 0.32, 1] as const,
  responsive: [0.4, 0, 0.6, 1] as const,
  gentle: [0.25, 0.1, 0.25, 1] as const,
};

// Standard transitions
export const transitions: Record<string, Transition> = {
  fast: { duration: 0.15, ease: easing.responsive },
  normal: { duration: 0.25, ease: easing.sharp },
  smooth: { duration: 0.35, ease: easing.settle },
  gentle: { duration: 0.5, ease: easing.gentle },
  spring: { type: "spring", stiffness: 400, damping: 30 },
  springGentle: { type: "spring", stiffness: 200, damping: 25 },
};

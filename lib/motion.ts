/**
 * Motion Design System for Personal Finance App
 *
 * Design principles:
 * - Professional: Clean, precise movements
 * - Confident: Decisive animations, no wobble
 * - Functional: Motion serves purpose, not decoration
 *
 * Easing curves inspired by financial precision
 */

import { Variants, Transition } from 'framer-motion';

// Custom easing curves for finance app
export const easing = {
  // Sharp, professional - like a bank transaction
  sharp: [0.4, 0, 0.2, 1] as const,
  // Smooth settle - like money settling in account
  settle: [0.23, 1, 0.32, 1] as const,
  // Quick response - instant feedback
  responsive: [0.4, 0, 0.6, 1] as const,
  // Gentle ease - for subtle transitions
  gentle: [0.25, 0.1, 0.25, 1] as const,
};

// Standard transitions
export const transitions: Record<string, Transition> = {
  fast: { duration: 0.15, ease: easing.responsive },
  normal: { duration: 0.25, ease: easing.sharp },
  smooth: { duration: 0.35, ease: easing.settle },
  gentle: { duration: 0.5, ease: easing.gentle },
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  springGentle: { type: 'spring', stiffness: 200, damping: 25 },
};

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: transitions.fast,
  },
};

// Card animation variants
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.smooth,
  },
  hover: {
    y: -2,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    transition: transitions.fast,
  },
  tap: {
    scale: 0.99,
    transition: transitions.fast,
  },
};

// Stagger container for lists of cards
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// List item variants (for transactions, rules, etc.)
export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -8,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    x: 8,
    height: 0,
    marginBottom: 0,
    transition: { ...transitions.fast, height: { delay: 0.1 } },
  },
  hover: {
    backgroundColor: 'rgba(136, 136, 136, 0.05)',
    transition: transitions.fast,
  },
};

// Button variants
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
  },
};

// Modal/Dialog variants
export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: transitions.fast,
  },
};

// Progress bar fill animation
export const progressVariants: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (value: number) => ({
    scaleX: value / 100,
    transition: {
      duration: 0.8,
      ease: easing.settle,
      delay: 0.2,
    },
  }),
};

// Number counter animation config
export const numberCounterConfig = {
  duration: 0.8,
  ease: easing.settle,
  delay: 0.1,
};

// Chart animation variants
export const chartVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: easing.gentle,
    },
  },
};

// Pie/Donut slice variants
export const pieSliceVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: easing.settle,
    },
  }),
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
};

// Bar chart bar variants
export const barVariants: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (i: number) => ({
    scaleX: 1,
    transition: {
      delay: 0.1 + i * 0.08,
      duration: 0.5,
      ease: easing.settle,
    },
  }),
};

// Notification/Toast variants
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: transitions.fast,
  },
};

// Dropdown/Select variants
export const dropdownVariants: Variants = {
  initial: {
    opacity: 0,
    y: -4,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.fast,
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Skeleton pulse animation
export const skeletonVariants: Variants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Fade in/out simple
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.fast },
};

// Scale on tap for icon buttons
export const iconButtonVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.1, transition: transitions.fast },
  tap: { scale: 0.9, transition: { duration: 0.1 } },
};

// Check mark animation
export const checkmarkVariants: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.3, ease: easing.sharp },
      opacity: { duration: 0.1 },
    },
  },
};

// Attention pulse for items needing action
export const attentionPulseVariants: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Slide in from direction
export const slideVariants = {
  fromLeft: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: transitions.normal },
    exit: { x: -20, opacity: 0, transition: transitions.fast },
  },
  fromRight: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: transitions.normal },
    exit: { x: 20, opacity: 0, transition: transitions.fast },
  },
  fromTop: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: transitions.normal },
    exit: { y: -20, opacity: 0, transition: transitions.fast },
  },
  fromBottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: transitions.normal },
    exit: { y: 20, opacity: 0, transition: transitions.fast },
  },
};

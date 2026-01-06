/**
 * Motion Design System
 *
 * Export all motion components and hooks for the personal finance app.
 * These provide professional, subtle animations tailored for financial data.
 */

// Cards and containers
export {
  AnimatedCard,
  AnimatedCardGrid,
  StaggerItem,
} from "./animated-card";

// Numbers and values
export {
  AnimatedNumber,
  AnimatedDifference,
} from "./animated-number";

// Lists and tables
export {
  AnimatedList,
  AnimatedListItem,
  AnimatedTableRow,
} from "./animated-list";

// Page and section transitions
export {
  PageTransition,
  SectionTransition,
  FadeIn,
  ScaleIn,
} from "./page-transition";

// Progress indicators
export {
  AnimatedProgress,
  BudgetProgress,
} from "./animated-progress";

// Buttons
export {
  MotionButton,
  IconButton,
  buttonVariants as motionButtonVariants,
} from "./motion-button";

// Icons
export {
  AnimatedCheck,
  AnimatedX,
  LoadingSpinner,
  AnimatedDot,
  AnimatedArrow,
  MoneyIcon,
} from "./animated-icons";

// Microinteractions
export {
  AnimatedCheckbox,
  AnimatedToggle,
  useRipple,
  PressableCard,
  ExpandingInput,
  PulseOnChange,
  ShakeOnError,
  SuccessCheck,
  DeleteConfirm,
  CountBadge,
  HoverGlow,
} from "./microinteractions";

// Hooks
export {
  useInteraction,
  useToggle,
  useModalSound,
  useActionSound,
  useTransactionSound,
} from "./use-interaction";

// Re-export motion configuration
export * from "@/lib/motion";
export { playSound, useSounds, soundSystem } from "@/lib/sounds";

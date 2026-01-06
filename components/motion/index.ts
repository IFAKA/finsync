/**
 * Motion Design System
 *
 * Export motion components for the personal finance app.
 */

export { StaggerItem } from "./animated-card";
export { AnimatedNumber } from "./animated-number";
export { FadeIn } from "./page-transition";
export { AnimatedProgress } from "./animated-progress";
export { MotionButton, buttonVariants as motionButtonVariants } from "./motion-button";

// Re-export motion configuration
export { easing, transitions } from "@/lib/motion";
export { playSound } from "@/lib/sounds";

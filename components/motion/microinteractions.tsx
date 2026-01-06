"use client";

import * as React from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

/**
 * AnimatedCheckbox - Checkbox with satisfying check animation
 */
interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  label?: string;
  sound?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const checkSizes = {
  sm: 10,
  md: 12,
  lg: 14,
};

export function AnimatedCheckbox({
  checked,
  onChange,
  className,
  size = "md",
  disabled = false,
  label,
  sound = true,
}: AnimatedCheckboxProps) {
  const handleChange = () => {
    if (disabled) return;
    if (sound) playSound(checked ? "click" : "toggle");
    onChange(!checked);
  };

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleChange}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "relative rounded border-2 transition-colors",
          sizeClasses[size],
          checked
            ? "bg-foreground border-foreground"
            : "bg-transparent border-border hover:border-muted-foreground"
        )}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.svg
                width={checkSizes[size]}
                height={checkSizes[size]}
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-background"
              >
                <motion.path
                  d="M2 6l3 3 5-6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

/**
 * AnimatedToggle - Toggle switch with smooth animation
 */
interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
  sound?: boolean;
}

export function AnimatedToggle({
  checked,
  onChange,
  className,
  disabled = false,
  label,
  size = "md",
  sound = true,
}: AnimatedToggleProps) {
  const handleToggle = () => {
    if (disabled) return;
    if (sound) playSound("toggle");
    onChange(!checked);
  };

  const dimensions = size === "sm"
    ? { width: 36, height: 20, knob: 16, translate: 16 }
    : { width: 44, height: 24, knob: 20, translate: 20 };

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative rounded-full transition-colors",
          checked ? "bg-foreground" : "bg-border"
        )}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <motion.span
          className="absolute top-1/2 left-0.5 -translate-y-1/2 bg-background rounded-full shadow-sm"
          style={{ width: dimensions.knob, height: dimensions.knob }}
          animate={{ x: checked ? dimensions.translate : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

/**
 * Ripple - Click ripple effect component
 */
interface RippleProps {
  className?: string;
  color?: string;
}

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function useRipple() {
  const [ripples, setRipples] = React.useState<RippleItem[]>([]);

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple: RippleItem = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, ripple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
  };

  const RippleContainer = ({ className, color = "currentColor" }: RippleProps) => (
    <span className={cn("absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none", className)}>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: color,
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );

  return { addRipple, RippleContainer };
}

/**
 * PressableCard - Card with press feedback
 */
interface PressableCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  sound?: boolean;
}

export function PressableCard({
  children,
  className,
  onClick,
  disabled = false,
  sound = true,
}: PressableCardProps) {
  const { addRipple, RippleContainer } = useRipple();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    addRipple(e);
    if (sound) playSound("click");
    onClick?.();
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card cursor-pointer",
        "transition-shadow hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <RippleContainer color="rgba(0, 112, 243, 0.1)" />
      {children}
    </motion.div>
  );
}

/**
 * ExpandingInput - Input that expands on focus
 */
interface ExpandingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sound?: boolean;
}

export const ExpandingInput = React.forwardRef<HTMLInputElement, ExpandingInputProps>(
  ({ className, sound = true, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (sound) playSound("click");
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <motion.div
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.15 }}
        className="relative"
      >
        <input
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2",
            "text-base sm:text-sm placeholder:text-muted-foreground",
            "transition-all duration-200",
            isFocused && "ring-2 ring-accent ring-offset-2 ring-offset-background border-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[44px] sm:min-h-0",
            className
          )}
          {...props}
        />
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          initial={false}
          animate={{
            boxShadow: isFocused
              ? "0 0 0 3px rgba(0, 112, 243, 0.1)"
              : "0 0 0 0px rgba(0, 112, 243, 0)",
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
    );
  }
);
ExpandingInput.displayName = "ExpandingInput";

/**
 * PulseOnChange - Wrapper that pulses when children change
 */
interface PulseOnChangeProps {
  children: React.ReactNode;
  value: unknown;
  className?: string;
}

export function PulseOnChange({ children, value, className }: PulseOnChangeProps) {
  const controls = useAnimation();
  const prevValue = React.useRef(value);

  React.useEffect(() => {
    if (prevValue.current !== value) {
      controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.3 },
      });
      prevValue.current = value;
    }
  }, [value, controls]);

  return (
    <motion.div animate={controls} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * ShakeOnError - Shakes when error prop is true
 */
interface ShakeOnErrorProps {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}

export function ShakeOnError({ children, error, className }: ShakeOnErrorProps) {
  return (
    <motion.div
      animate={error ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * SuccessCheck - Animated success checkmark overlay
 */
interface SuccessCheckProps {
  show: boolean;
  onComplete?: () => void;
  size?: number;
}

export function SuccessCheck({ show, onComplete, size = 48 }: SuccessCheckProps) {
  React.useEffect(() => {
    if (show) {
      playSound("success");
    }
  }, [show]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
            className="rounded-full bg-success p-2"
          >
            <motion.svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-background"
            >
              <motion.path
                d="M20 6L9 17l-5-5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              />
            </motion.svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * DeleteConfirm - Animated delete confirmation
 */
interface DeleteConfirmProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirm({ show, onConfirm, onCancel }: DeleteConfirmProps) {
  const handleConfirm = () => {
    playSound("error");
    onConfirm();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleConfirm}
            className="p-1.5 rounded-md bg-error text-white hover:bg-error/90"
          >
            <Check className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              playSound("click");
              onCancel();
            }}
            className="p-1.5 rounded-md bg-muted hover:bg-muted/80"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * CountBadge - Animated count badge
 */
interface CountBadgeProps {
  count: number;
  className?: string;
  max?: number;
}

export function CountBadge({ count, className, max = 99 }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  return (
    <AnimatePresence mode="wait">
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className={cn(
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full",
            "bg-error text-white text-xs font-medium tabular-nums",
            className
          )}
        >
          {displayCount}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * HoverGlow - Adds a glow effect on hover
 */
interface HoverGlowProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export function HoverGlow({ children, className, color = "rgba(0, 112, 243, 0.15)" }: HoverGlowProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn("relative", className)}
    >
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        animate={{
          boxShadow: isHovered ? `0 0 20px 2px ${color}` : `0 0 0px 0px ${color}`,
        }}
        transition={{ duration: 0.2 }}
      />
      {children}
    </motion.div>
  );
}

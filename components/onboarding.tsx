"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Upload, Tags, PiggyBank, Sparkles } from "lucide-react";
import {
  MotionButton,
  FadeIn,
  playSound,
  transitions,
  easing,
} from "@/components/motion";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

interface OnboardingProps {
  onUploadClick: () => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Budget",
    description: "Track your spending, set budgets, and take control of your finances.",
    detail: "All data stays on your device.",
    icon: PiggyBank,
  },
  {
    id: "categories",
    title: "Smart Categories",
    description: "Transactions are automatically categorized using AI that runs entirely on your device.",
    detail: "We've set up default categories for you.",
    icon: Tags,
  },
  {
    id: "upload",
    title: "Import Your Data",
    description: "Upload your bank statement (Excel format) to get started.",
    detail: "We support most Spanish banks.",
    icon: Upload,
  },
];

// Step content slide animation
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: easing.settle,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: easing.sharp,
    },
  }),
};

// Icon container animation
const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
      delay: 0.1,
    },
  },
};

export function Onboarding({ onUploadClick }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const handleNext = () => {
    playSound("click");
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    playSound("click");
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpload = () => {
    playSound("click");
    onUploadClick();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;

  // Mobile: Full-screen, touch-optimized layout
  if (isMobile) {
    return (
      <FadeIn className="min-h-screen flex flex-col bg-background">
        {/* Progress bar at top */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <motion.div
                key={i}
                className="h-1 flex-1 rounded-full bg-border overflow-hidden"
              >
                <motion.div
                  className="h-full bg-foreground rounded-full"
                  initial={{ width: i < currentStep ? "100%" : "0%" }}
                  animate={{ width: i <= currentStep ? "100%" : "0%" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>

        {/* Content area - takes remaining space */}
        <div className="flex-1 flex flex-col justify-center px-6 pb-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-center"
            >
              <motion.div
                variants={iconVariants}
                initial="initial"
                animate="animate"
                className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-muted flex items-center justify-center"
              >
                <Icon className="w-12 h-12 text-foreground" strokeWidth={1.5} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...transitions.normal }}
                className="text-3xl font-semibold mb-4"
              >
                {step.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ...transitions.normal }}
                className="text-lg text-muted-foreground leading-relaxed mb-2"
              >
                {step.description}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, ...transitions.normal }}
                className="text-sm text-muted-foreground/70"
              >
                {step.detail}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed bottom action area */}
        <div className="px-6 pb-8 pt-4 space-y-3 bg-gradient-to-t from-background via-background to-transparent">
          {isLastStep ? (
            <MotionButton
              onClick={handleUpload}
              sound="click"
              className="w-full h-14 text-base"
            >
              <Upload className="w-5 h-5" />
              Upload Statement
            </MotionButton>
          ) : (
            <MotionButton
              onClick={handleNext}
              sound="click"
              className="w-full h-14 text-base"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </MotionButton>
          )}

          {currentStep > 0 && (
            <MotionButton
              variant="ghost"
              onClick={handlePrev}
              sound="click"
              className="w-full h-12"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </MotionButton>
          )}
        </div>
      </FadeIn>
    );
  }

  // Desktop: Centered card layout with more visuals
  return (
    <FadeIn className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-lg">
        {/* Card container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-lg"
        >
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Budget.</span>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <motion.div
                key={i}
                className="h-2 rounded-full bg-border"
                animate={{
                  width: i === currentStep ? 32 : 8,
                  backgroundColor: i === currentStep ? "hsl(var(--foreground))" : "hsl(var(--border))",
                }}
                transition={transitions.fast}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative min-h-[300px] flex items-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full text-center"
              >
                <motion.div
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center"
                >
                  <Icon className="w-10 h-10 text-foreground" strokeWidth={1.5} />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, ...transitions.normal }}
                  className="text-2xl font-semibold mb-4"
                >
                  {step.title}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, ...transitions.normal }}
                  className="text-muted-foreground leading-relaxed mb-2"
                >
                  {step.description}
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, ...transitions.normal }}
                  className="text-sm text-muted-foreground/70"
                >
                  {step.detail}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
            <MotionButton
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              sound="click"
              className={currentStep === 0 ? "invisible" : ""}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </MotionButton>

            {isLastStep ? (
              <MotionButton onClick={handleUpload} sound="click" size="lg">
                <Upload className="w-4 h-4" />
                Upload Statement
              </MotionButton>
            ) : (
              <MotionButton onClick={handleNext} sound="click" size="lg">
                Continue
                <ChevronRight className="w-4 h-4" />
              </MotionButton>
            )}
          </div>
        </motion.div>

        {/* Footer text outside card */}
        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Your data never leaves your device
        </p>
      </div>
    </FadeIn>
  );
}

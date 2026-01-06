"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { usePWA } from "./use-pwa";

const STORAGE_KEYS = {
  DISMISSED_AT: "install-prompt-dismissed-at",
  PROMPT_SHOWN: "install-prompt-shown-this-session",
  ONBOARDING_COMPLETED: "onboarding_completed",
} as const;

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const PROMPT_DELAY_MS = 3000; // 3 seconds after onboarding completes

export function useInstallPrompt() {
  const { canInstall, install, isStandalone } = usePWA();
  const hasShownRef = useRef(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Check onboarding status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkOnboarding = () => {
      const completed =
        localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === "true";
      setIsOnboardingComplete(completed);
    };

    checkOnboarding();

    // Listen for storage changes (in case onboarding completes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ONBOARDING_COMPLETED) {
        checkOnboarding();
      }
    };

    window.addEventListener("storage", handleStorage);

    // Also poll for changes since storage events don't fire in the same tab
    const interval = setInterval(checkOnboarding, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const shouldShowPrompt = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    if (isStandalone) return false;
    if (!canInstall) return false;
    if (!isOnboardingComplete) return false;

    // Check if already shown this session
    const shownThisSession = sessionStorage.getItem(STORAGE_KEYS.PROMPT_SHOWN);
    if (shownThisSession) return false;

    // Check if explicitly dismissed (clicked "Not now")
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
        return false;
      }
      // Enough time has passed, clear the dismissal
      localStorage.removeItem(STORAGE_KEYS.DISMISSED_AT);
    }

    return true;
  }, [canInstall, isStandalone, isOnboardingComplete]);

  const showPrompt = useCallback(() => {
    if (hasShownRef.current) return;
    if (!shouldShowPrompt()) return;

    hasShownRef.current = true;
    sessionStorage.setItem(STORAGE_KEYS.PROMPT_SHOWN, "true");

    toast("Install Budget", {
      description: "Get quick access and offline support",
      duration: 15000,
      action: {
        label: "Install",
        onClick: async () => {
          const success = await install();
          if (success) {
            toast.success("App installed!");
          }
        },
      },
      cancel: {
        label: "Not now",
        onClick: () => {
          // Only explicit "Not now" sets 2-week dismissal
          localStorage.setItem(
            STORAGE_KEYS.DISMISSED_AT,
            Date.now().toString()
          );
        },
      },
      // Auto-dismiss and swipe away: just mark session as shown
      // Next visit will show prompt again (no long dismissal)
    });
  }, [shouldShowPrompt, install]);

  // Show prompt after onboarding completes
  useEffect(() => {
    if (!isOnboardingComplete) return;
    if (!canInstall) return;
    if (isStandalone) return;

    // Delay to let user see the app first
    const timer = setTimeout(() => {
      showPrompt();
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isOnboardingComplete, canInstall, isStandalone, showPrompt]);

  return {
    showPrompt,
    canInstall,
    isStandalone,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface UsePWAReturn {
  /** Whether the app can be installed (prompt available and not in standalone) */
  canInstall: boolean;
  /** Whether the app has been installed */
  isInstalled: boolean;
  /** Whether the app is running in standalone mode (installed PWA) */
  isStandalone: boolean;
  /** Whether the service worker is registered and active */
  isServiceWorkerActive: boolean;
  /** Trigger the install prompt */
  install: () => Promise<boolean>;
  /** Check if there's a service worker update available */
  checkForUpdates: () => Promise<boolean>;
}

export function usePWA(): UsePWAReturn {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Check if already in standalone mode (installed PWA)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error - iOS Safari specific
        window.navigator.standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => checkStandalone();
    mediaQuery.addEventListener("change", handleChange);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
          setIsServiceWorkerActive(!!registration.active);

          // Check for updates periodically
          registration.addEventListener("updatefound", () => {
            console.log("Service Worker update found");
          });
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });

      // Check if SW is already active
      if (navigator.serviceWorker.controller) {
        setIsServiceWorkerActive(true);
      }
    }

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === "accepted") {
        setInstallPrompt(null);
        return true;
      }
    } catch (err) {
      console.error("Install prompt error:", err);
    }

    return false;
  }, [installPrompt]);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return !!registration.waiting;
      }
    } catch (err) {
      console.error("Update check error:", err);
    }

    return false;
  }, []);

  return {
    canInstall: !!installPrompt && !isStandalone,
    isInstalled,
    isStandalone,
    isServiceWorkerActive,
    install,
    checkForUpdates,
  };
}

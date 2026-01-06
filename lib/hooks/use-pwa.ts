"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  /** Whether a new version is waiting to be activated */
  updateAvailable: boolean;
  /** Trigger the install prompt */
  install: () => Promise<boolean>;
  /** Check if there's a service worker update available */
  checkForUpdates: () => Promise<boolean>;
  /** Apply the pending update and reload */
  applyUpdate: () => void;
}

export function usePWA(): UsePWAReturn {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

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

    // Register service worker (skip in development to avoid caching issues)
    const isDev = process.env.NODE_ENV === "development";
    if ("serviceWorker" in navigator && !isDev) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registrationRef.current = registration;
          setIsServiceWorkerActive(!!registration.active);

          // Check if there's already a waiting worker
          if (registration.waiting) {
            setUpdateAvailable(true);
          }

          // Listen for new service worker installing
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              // When the new worker is installed and waiting
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });

      // Check if SW is already active
      if (navigator.serviceWorker.controller) {
        setIsServiceWorkerActive(true);
      }

      // Reload when the new service worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } else if (isDev && "serviceWorker" in navigator) {
      // Unregister any existing service worker in development
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
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
        const hasUpdate = !!registration.waiting;
        setUpdateAvailable(hasUpdate);
        return hasUpdate;
      }
    } catch (err) {
      console.error("Update check error:", err);
    }

    return false;
  }, []);

  const applyUpdate = useCallback(() => {
    const registration = registrationRef.current;
    if (!registration?.waiting) return;

    // Tell the waiting service worker to skip waiting
    registration.waiting.postMessage("skipWaiting");
    // The controllerchange event listener will handle the reload
  }, []);

  // Auto-update when app is backgrounded (user switches tab/app)
  useEffect(() => {
    if (!updateAvailable) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        applyUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [updateAvailable, applyUpdate]);

  return {
    canInstall: !!installPrompt && !isStandalone,
    isInstalled,
    isStandalone,
    isServiceWorkerActive,
    updateAvailable,
    install,
    checkForUpdates,
    applyUpdate,
  };
}

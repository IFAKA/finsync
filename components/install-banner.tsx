"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/lib/hooks/use-pwa";

export function InstallBanner() {
  const { canInstall, install, isStandalone } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only show after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem("install-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("install-banner-dismissed", "true");
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setDismissed(true);
    }
  };

  // Don't render until mounted, or if dismissed, or if can't install, or already installed
  if (!mounted || dismissed || !canInstall || isStandalone) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-primary text-primary-foreground overflow-hidden"
      >
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-sm">
            Install Budget for quick access and offline support
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              className="h-8"
            >
              <Download className="w-4 h-4 mr-1" />
              Install
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="hover:bg-primary-foreground/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

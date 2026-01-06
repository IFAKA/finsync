"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!mounted || isOnline) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-yellow-500 text-yellow-950 overflow-hidden fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto rounded-lg shadow-lg z-50"
      >
        <div className="px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">
            You&apos;re offline. Changes will sync when reconnected.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

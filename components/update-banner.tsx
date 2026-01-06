"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { usePWA } from "@/lib/hooks/use-pwa";
import { Button } from "@/components/ui/button";

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWA();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-blue-500 text-white overflow-hidden fixed top-0 left-0 right-0 z-50"
        >
          <div className="px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">
                A new version is available
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={applyUpdate}
              className="shrink-0 h-7 text-xs"
            >
              Update now
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

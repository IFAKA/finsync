"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface SimilarTransactionsPillProps {
  similarCount: number;
  onCreateRule: () => void;
  onDismiss: () => void;
}

export function SimilarTransactionsPill({
  similarCount,
  onCreateRule,
  onDismiss,
}: SimilarTransactionsPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-foreground text-background rounded-full shadow-lg flex items-center gap-1 pl-4 pr-1 py-1">
        <span className="text-sm font-medium">{similarCount} similar</span>
        <button
          onClick={onCreateRule}
          className="text-sm font-medium px-3 py-1.5 rounded-full bg-background/20 hover:bg-background/30 transition-colors"
        >
          Create rule →
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-full hover:bg-background/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

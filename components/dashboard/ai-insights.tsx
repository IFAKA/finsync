"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIInsightsProps {
  insight: string | null;
  isLoading: boolean;
  isModelLoading: boolean;
  modelProgress: string;
  error: string | null;
  onRegenerate: () => void;
  className?: string;
  variant?: "card" | "inline";
}

export function AIInsights({
  insight,
  isLoading,
  isModelLoading,
  modelProgress,
  error,
  onRegenerate,
  className,
  variant = "card",
}: AIInsightsProps) {
  // Don't render anything if no insight and not loading
  if (!insight && !isLoading && !isModelLoading && !error) {
    return null;
  }

  const content = (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        <AnimatePresence mode="wait">
          {isLoading || isModelLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="sparkles"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {isModelLoading ? (
            <motion.div
              key="model-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              <p className="text-sm text-muted-foreground">Loading AI model...</p>
              <p className="text-xs text-muted-foreground/70 truncate">
                {modelProgress || "Initializing..."}
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-muted-foreground">Generating insight...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-muted-foreground">{error}</p>
            </motion.div>
          ) : insight ? (
            <motion.p
              key="insight"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm leading-relaxed"
            >
              {insight}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {insight && !isLoading && !isModelLoading && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onRegenerate}
          title="Regenerate insight"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );

  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "overflow-hidden rounded-lg bg-primary/5 border border-primary/10 p-3",
          className
        )}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-4">{content}</CardContent>
      </Card>
    </motion.div>
  );
}

// Compact version for mobile
export function AIInsightsCompact({
  insight,
  isLoading,
  isModelLoading,
  className,
}: {
  insight: string | null;
  isLoading: boolean;
  isModelLoading: boolean;
  className?: string;
}) {
  if (!insight && !isLoading && !isModelLoading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-primary/5 border border-primary/10 rounded-xl p-3",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <AnimatePresence mode="wait">
          {isLoading || isModelLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0 mt-0.5" />
            </motion.div>
          ) : (
            <motion.div
              key="sparkles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isLoading || isModelLoading ? (
            <motion.p
              key="loading-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground"
            >
              {isModelLoading ? "Loading AI..." : "Generating..."}
            </motion.p>
          ) : insight ? (
            <motion.p
              key="insight-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs leading-relaxed line-clamp-3"
            >
              {insight}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

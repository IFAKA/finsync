"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { playSound } from "@/lib/sounds";

interface MonthNavigatorProps {
  selectedMonth: string | null;
  availableMonths: string[];
  onNavigate: (month: string) => void;
  variant?: "mobile" | "desktop";
  className?: string;
}

export function formatMonth(monthStr: string, style: "long" | "short" = "long"): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "2-digit" : "numeric",
  });
}

export function useMonthNavigation(
  availableMonths: string[],
  selectedMonth: string | null,
  onMonthChange: (month: string) => void
) {
  const navigateMonth = (delta: number) => {
    if (!availableMonths.length || !selectedMonth) return;
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const newIndex = currentIndex - delta;
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      playSound("click");
      onMonthChange(availableMonths[newIndex]);
    }
  };

  const canGoNewer = availableMonths.length > 0 && selectedMonth
    ? availableMonths.indexOf(selectedMonth) > 0
    : false;

  const canGoOlder = availableMonths.length > 0 && selectedMonth
    ? availableMonths.indexOf(selectedMonth) < availableMonths.length - 1
    : false;

  return { navigateMonth, canGoNewer, canGoOlder };
}

export function MonthNavigator({
  selectedMonth,
  availableMonths,
  onNavigate,
  variant = "mobile",
  className = "",
}: MonthNavigatorProps) {
  const { navigateMonth, canGoNewer, canGoOlder } = useMonthNavigation(
    availableMonths,
    selectedMonth,
    onNavigate
  );

  const isMobile = variant === "mobile";
  const buttonSize = isMobile ? "h-10 w-10" : "h-9 w-9";
  const textSize = isMobile ? "text-base" : "text-lg";
  const minWidth = isMobile ? "min-w-[110px]" : "min-w-[140px]";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={!isMobile ? { scale: 1.1 } : undefined}
        onClick={() => navigateMonth(-1)}
        disabled={!canGoOlder}
        className={`${buttonSize} flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30`}
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>
      <AnimatePresence mode="wait">
        <motion.span
          key={selectedMonth}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={`${textSize} font-semibold ${minWidth} text-center`}
        >
          {selectedMonth ? formatMonth(selectedMonth) : "—"}
        </motion.span>
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={!isMobile ? { scale: 1.1 } : undefined}
        onClick={() => navigateMonth(1)}
        disabled={!canGoNewer}
        className={`${buttonSize} flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30`}
      >
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}

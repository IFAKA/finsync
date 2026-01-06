"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  AlertTriangle,
  List,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AnimatedNumber } from "@/components/motion";
import { MonthNavigator, formatMonth } from "@/components/month-navigator";
import type { LocalCategory } from "@/lib/hooks/db";
import type { BudgetItem } from "./use-dashboard-data";

interface BentoMobileProps {
  summary: {
    income: number;
    expenses: number;
    savings: number;
    byCategory: Array<{ categoryId: string; amount: number }>;
  };
  budgetData: BudgetItem[];
  attentionCount: number;
  transactionCount: number;
  selectedMonth: string | null;
  availableMonths: string[];
  onUploadClick: () => void;
  onMonthChange: (month: string) => void;
  categories: LocalCategory[];
  topCategories: Array<{
    categoryId: string;
    amount: number;
    categoryName: string;
    categoryColor: string;
  }>;
  budgetPercent: number;
  budgetTotal: number;
}

export function BentoMobileDashboard({
  summary,
  budgetData,
  attentionCount,
  transactionCount,
  selectedMonth,
  availableMonths,
  onUploadClick,
  onMonthChange,
  topCategories,
  budgetPercent,
  budgetTotal,
}: BentoMobileProps) {
  const router = useRouter();
  const maxCategorySpend = topCategories[0]?.amount || 1;

  return (
    <div className="space-y-3 md:hidden">
      <div className="flex items-center justify-between">
        <MonthNavigator
          selectedMonth={selectedMonth}
          availableMonths={availableMonths}
          onNavigate={onMonthChange}
          variant="mobile"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onUploadClick}
          className="h-10 w-10 flex items-center justify-center bg-foreground text-background rounded-lg"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          onClick={() => router.push(`/transactions?month=${selectedMonth}`)}
          className="bg-card border border-border rounded-xl p-4 active:scale-[0.98] transition-transform cursor-pointer touch-feedback"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="text-xs">Spent</span>
          </div>
          <p className="text-fluid-2xl font-semibold tabular-nums">
            <AnimatedNumber value={summary.expenses} />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push(`/transactions?month=${selectedMonth}`)}
          className="bg-card border border-border rounded-xl p-4 active:scale-[0.98] transition-transform cursor-pointer touch-feedback"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">Income</span>
          </div>
          <p className="text-fluid-2xl font-semibold tabular-nums text-success">
            +<AnimatedNumber value={summary.income} />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4 touch-feedback"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <PiggyBank className="w-3.5 h-3.5" />
            <span className="text-xs">Saved</span>
          </div>
          <p
            className={`text-fluid-2xl font-semibold tabular-nums ${
              summary.savings >= 0 ? "text-success" : "text-error"
            }`}
          >
            {summary.savings >= 0 ? "+" : ""}
            <AnimatedNumber value={summary.savings} />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push("/budgets")}
          className="bg-card border border-border rounded-xl p-4 active:scale-[0.98] transition-transform cursor-pointer touch-feedback"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">Budget</span>
          </div>
          {budgetTotal > 0 ? (
            <>
              <p
                className={`text-2xl font-semibold tabular-nums ${
                  budgetPercent > 100
                    ? "text-error"
                    : budgetPercent > 80
                    ? "text-warning"
                    : ""
                }`}
              >
                {budgetPercent}%
              </p>
              <div className="mt-1.5 h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    budgetPercent > 100
                      ? "bg-error"
                      : budgetPercent > 80
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={() => router.push(`/transactions?month=${selectedMonth}`)}
        className="bg-card border border-border rounded-xl p-4 active:scale-[0.99] transition-transform cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Top Spending</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-2.5">
          {topCategories.map((cat, i) => (
            <div key={cat.categoryId || i} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.categoryColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-sm truncate">{cat.categoryName}</span>
                  <span className="text-sm tabular-nums font-medium shrink-0">
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.amount / maxCategorySpend) * 100}%` }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.categoryColor }}
                  />
                </div>
              </div>
            </div>
          ))}
          {topCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No spending yet
            </p>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => router.push("/transactions")}
          className={`border rounded-xl p-3 active:scale-[0.98] transition-transform cursor-pointer ${
            attentionCount > 0
              ? "bg-warning/10 border-warning/30"
              : "bg-card border-border"
          }`}
        >
          <div className="flex items-center gap-2">
            {attentionCount > 0 && (
              <AlertTriangle className="w-4 h-4 text-warning" />
            )}
            <span className="text-sm">
              {attentionCount > 0 ? (
                <>
                  <span className="font-semibold">{attentionCount}</span> need
                  review
                </>
              ) : (
                <span className="text-muted-foreground">All categorized</span>
              )}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          onClick={() => router.push(`/transactions?month=${selectedMonth}`)}
          className="bg-card border border-border rounded-xl p-3 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{transactionCount}</span>{" "}
              transactions
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

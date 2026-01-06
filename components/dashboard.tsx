"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, ArrowRight, AlertTriangle, List, TrendingUp, TrendingDown, PiggyBank, Target } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTransactions,
  useCategories,
  useAvailableMonths,
  useBudgets,
  useMonthlySummary,
  useTransactionMutations,
  useTransactionCount,
  type LocalCategory,
} from "@/lib/hooks/use-local-db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SpendingBarChart } from "./spending-chart";
import {
  AnimatedNumber,
  MotionButton,
  FadeIn,
  StaggerItem,
  playSound,
} from "@/components/motion";

interface DashboardProps {
  onUploadClick: () => void;
}

interface BudgetItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetId: string | null;
  monthlyLimit: number | null;
  spent: number;
}

interface BentoMobileProps {
  summary: { income: number; expenses: number; savings: number; byCategory: Array<{ categoryId: string; amount: number }> };
  budgetData: BudgetItem[];
  attentionCount: number;
  transactionCount: number;
  selectedMonth: string | null;
  onUploadClick: () => void;
  onNavigateMonth: (delta: number) => void;
  canGoNewer: boolean;
  canGoOlder: boolean;
  formatMonth: (monthStr: string) => string;
  categories: LocalCategory[];
}

function BentoMobileDashboard({
  summary,
  budgetData,
  attentionCount,
  transactionCount,
  selectedMonth,
  onUploadClick,
  onNavigateMonth,
  canGoNewer,
  canGoOlder,
  formatMonth,
  categories,
}: BentoMobileProps) {
  const router = useRouter();

  const budgetUsed = budgetData.reduce((acc, b) => acc + b.spent, 0);
  const budgetTotal = budgetData.reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);
  const budgetPercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  const topCategories = summary.byCategory
    .map((c) => {
      const cat = categories.find((cat) => cat.id === c.categoryId);
      return {
        ...c,
        categoryName: cat?.name || "Uncategorized",
        categoryColor: cat?.color || "#888",
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const maxCategorySpend = topCategories[0]?.amount || 1;

  return (
    <div className="space-y-3 md:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigateMonth(-1)}
            disabled={!canGoOlder}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <AnimatePresence mode="wait">
            <motion.span
              key={selectedMonth}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-base font-semibold min-w-[110px] text-center"
            >
              {selectedMonth ? formatMonth(selectedMonth) : "—"}
            </motion.span>
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigateMonth(1)}
            disabled={!canGoNewer}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
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
          <p className={`text-fluid-2xl font-semibold tabular-nums ${summary.savings >= 0 ? "text-success" : "text-error"}`}>
            {summary.savings >= 0 ? "+" : ""}<AnimatedNumber value={summary.savings} />
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
              <p className={`text-2xl font-semibold tabular-nums ${budgetPercent > 100 ? "text-error" : budgetPercent > 80 ? "text-warning" : ""}`}>
                {budgetPercent}%
              </p>
              <div className="mt-1.5 h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${budgetPercent > 100 ? "bg-error" : budgetPercent > 80 ? "bg-warning" : "bg-success"}`}
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
            <p className="text-sm text-muted-foreground text-center py-2">No spending yet</p>
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
            {attentionCount > 0 && <AlertTriangle className="w-4 h-4 text-warning" />}
            <span className="text-sm">
              {attentionCount > 0 ? (
                <><span className="font-semibold">{attentionCount}</span> need review</>
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
              <span className="font-semibold">{transactionCount}</span> transactions
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function Dashboard({ onUploadClick }: DashboardProps) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const { data: availableMonths } = useAvailableMonths();
  const { data: transactionCountData } = useTransactionCount(selectedMonth || undefined);
  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(selectedMonth || "");
  const { data: budgets } = useBudgets(selectedMonth || undefined);
  const { data: transactions } = useTransactions({
    month: selectedMonth || undefined,
    limit: 50,
  });
  const { update: updateTransaction } = useTransactionMutations();

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const budgetData = useMemo(() => {
    if (!categories.length) return [];

    return categories.map((cat) => {
      const budget = budgets.find((b) => b.categoryId === cat.id);
      const spent = summary.byCategory.find((c) => c.categoryId === cat.id)?.amount || 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        budgetId: budget?.id || null,
        monthlyLimit: budget?.monthlyLimit || null,
        spent,
      };
    });
  }, [categories, budgets, summary.byCategory]);

  const attentionCount = transactions.filter((t) => !t.categoryId || t.needsReview).length;

  const chartData = useMemo(() => {
    return summary.byCategory.map((c) => {
      const cat = categories.find((cat) => cat.id === c.categoryId);
      return {
        categoryId: c.categoryId,
        categoryName: cat?.name || null,
        categoryColor: cat?.color || null,
        total: c.amount,
        isExpense: true,
      };
    });
  }, [summary.byCategory, categories]);

  const handleCategoryClick = (categoryId: string | number | null) => {
    if (!categoryId) return;
    const params = new URLSearchParams();
    params.set("category", String(categoryId));
    if (selectedMonth) params.set("month", selectedMonth);
    router.push(`/transactions?${params.toString()}`);
  };

  const navigateMonth = (delta: number) => {
    if (!availableMonths.length || !selectedMonth) return;
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const newIndex = currentIndex - delta;
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      playSound("click");
      setSelectedMonth(availableMonths[newIndex]);
    }
  };

  const canGoNewer = availableMonths.length > 0 && selectedMonth
    ? availableMonths.indexOf(selectedMonth) > 0
    : false;
  const canGoOlder = availableMonths.length > 0 && selectedMonth
    ? availableMonths.indexOf(selectedMonth) < availableMonths.length - 1
    : false;

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "2-digit",
    });
  };

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    try {
      await updateTransaction(transactionId, { categoryId, needsReview: false });
      toast.success("Category updated");
      playSound("complete");
    } catch {
      toast.error("Failed to update category");
      playSound("error");
    }
  };

  if (summaryLoading && availableMonths.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-border rounded" />
          <div className="h-10 w-24 bg-border rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-border rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BentoMobileDashboard
        summary={summary}
        budgetData={budgetData}
        attentionCount={attentionCount}
        transactionCount={transactionCountData}
        selectedMonth={selectedMonth}
        onUploadClick={onUploadClick}
        onNavigateMonth={navigateMonth}
        canGoNewer={canGoNewer}
        canGoOlder={canGoOlder}
        formatMonth={formatMonth}
        categories={categories}
      />

      <div className="hidden md:block space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateMonth(-1)}
                disabled={!canGoOlder}
                className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <AnimatePresence mode="wait">
                <motion.span
                  key={selectedMonth}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-lg font-medium min-w-[140px] text-center"
                >
                  {selectedMonth ? formatMonth(selectedMonth) : "—"}
                </motion.span>
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateMonth(1)}
                disabled={!canGoNewer}
                className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedMonth && (
              <MotionButton
                size="sm"
                variant="ghost"
                sound="click"
                onClick={() => router.push(`/transactions?month=${selectedMonth}`)}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">View All</span>
              </MotionButton>
            )}
            <MotionButton size="sm" variant="secondary" sound="click" onClick={onUploadClick}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </MotionButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StaggerItem index={0}>
            <Card className="hover-lift">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Income</p>
                <p className="text-2xl font-semibold text-success">
                  +<AnimatedNumber value={summary.income} />
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem index={1}>
            <Card className="hover-lift">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Spent</p>
                <p className="text-2xl font-semibold">
                  <AnimatedNumber value={summary.expenses} />
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem index={2}>
            <Card className="hover-lift">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Saved</p>
                <p className={`text-2xl font-semibold ${summary.savings >= 0 ? "text-success" : "text-error"}`}>
                  {summary.savings >= 0 ? "+" : ""}
                  <AnimatedNumber value={summary.savings} />
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FadeIn delay={0.2}>
            <Card className="hover-lift">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Recent</CardTitle>
                  {selectedMonth && (
                    <Link
                      href={`/transactions?month=${selectedMonth}`}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      View all
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-1">
                    {transactions.slice(0, 5).map((t, index) => {
                      const cat = categories.find((c) => c.id === t.categoryId);
                      return (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat?.color || "#888" }}
                            />
                            <span className="text-sm truncate">{t.merchant || t.description}</span>
                          </div>
                          <span className={`text-sm tabular-nums font-medium shrink-0 ${t.amount >= 0 ? "text-success" : ""}`}>
                            {t.amount >= 0 ? "+" : ""}
                            {formatCurrency(t.amount)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transactions this month
                  </p>
                )}
              </CardContent>
            </Card>
          </FadeIn>
          <FadeIn delay={0.3}>
            <Card className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendingBarChart data={chartData} onCategoryClick={handleCategoryClick} />
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {attentionCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Needs Attention
                  <span className="text-sm font-normal text-muted-foreground">({attentionCount})</span>
                </CardTitle>
                <Link
                  href="/transactions"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {transactions
                  .filter((t) => !t.categoryId || t.needsReview)
                  .slice(0, 5)
                  .map((t) => {
                    const cat = categories.find((c) => c.id === t.categoryId);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0 flex-1">
                          <span className="text-xs sm:text-sm text-muted-foreground w-auto sm:w-16 shrink-0">
                            {formatDate(t.date)}
                          </span>
                          <span className="text-sm truncate">{t.merchant || t.description}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <Select
                            value={t.categoryId || ""}
                            onValueChange={(value) => handleCategoryChange(t.id, value)}
                          >
                            <SelectTrigger
                              className="h-7 text-xs w-auto min-w-[100px] border-l-2"
                              style={{ borderLeftColor: cat?.color || "#888" }}
                            >
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                    {c.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className={`text-sm tabular-nums font-medium min-w-[70px] text-right ${t.amount >= 0 ? "text-success" : ""}`}>
                            {t.amount >= 0 ? "+" : ""}
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

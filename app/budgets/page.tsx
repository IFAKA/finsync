"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCategories,
  useAvailableMonths,
  useBudgets,
  useMonthlySummary,
  useBudgetMutations,
} from "@/lib/hooks/use-local-db";
import { formatCurrency } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoryId: string; categoryName: string } | null>(null);

  const { data: categories } = useCategories();
  const { data: availableMonths } = useAvailableMonths();
  const { data: budgets, isLoading } = useBudgets(selectedMonth || undefined);
  const { data: summary } = useMonthlySummary(selectedMonth || "");
  const { create: createBudget, update: updateBudget, remove: deleteBudget } = useBudgetMutations();

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    } else if (availableMonths.length === 0 && !selectedMonth) {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
  }, [availableMonths, selectedMonth]);

  const budgetData = useMemo(() => {
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

  const navigateMonth = (delta: number) => {
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const handleEdit = (categoryId: string, currentLimit: number | null) => {
    setEditingCategory(categoryId);
    setEditValue(currentLimit?.toString() || "");
  };

  const handleSave = async (categoryId: string) => {
    if (!selectedMonth) return;
    const limit = parseFloat(editValue);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const existingBudget = budgets.find((b) => b.categoryId === categoryId);
      if (existingBudget) {
        await updateBudget(existingBudget.id, { monthlyLimit: limit });
      } else {
        await createBudget({
          categoryId,
          month: selectedMonth,
          monthlyLimit: limit,
        });
      }
      toast.success("Budget updated");
      playSound("complete");
      setEditingCategory(null);
    } catch {
      toast.error("Failed to update budget");
      playSound("error");
    }
  };

  const handleDelete = (categoryId: string, categoryName: string) => {
    setDeleteConfirm({ categoryId, categoryName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const budget = budgets.find((b) => b.categoryId === deleteConfirm.categoryId);
    if (budget) {
      try {
        await deleteBudget(budget.id);
        toast.success("Budget removed");
        playSound("toggle");
      } catch {
        toast.error("Failed to remove budget");
        playSound("error");
      }
    }
    setDeleteConfirm(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === "Enter") {
      handleSave(categoryId);
    } else if (e.key === "Escape") {
      setEditingCategory(null);
    }
  };

  const totalBudgeted = budgetData.filter((b) => b.monthlyLimit).reduce((sum, b) => sum + (b.monthlyLimit || 0), 0);
  const totalSpent = budgetData.filter((b) => b.monthlyLimit).reduce((sum, b) => sum + b.spent, 0);
  const categoriesWithBudgets = budgetData.filter((b) => b.monthlyLimit);
  const categoriesWithoutBudgets = budgetData.filter((b) => !b.monthlyLimit && b.spent > 0);
  const budgetPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-3 sm:space-y-6">
      {/* Mobile Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between md:hidden"
      >
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(-1)}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
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
            onClick={() => navigateMonth(1)}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Desktop Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex items-center justify-between"
      >
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(-1)}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <AnimatePresence mode="wait">
            <motion.span
              key={selectedMonth}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-lg font-medium min-w-[160px] text-center"
            >
              {selectedMonth ? formatMonth(selectedMonth) : "Loading..."}
            </motion.span>
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(1)}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Summary */}
      {categoriesWithBudgets.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Budgeted</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalBudgeted)}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <p className={`text-xl font-semibold tabular-nums ${totalSpent > totalBudgeted ? "text-error" : ""}`}>
              {formatCurrency(totalSpent)}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-2 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {totalSpent <= totalBudgeted ? `${formatCurrency(totalBudgeted - totalSpent)} remaining` : `${formatCurrency(totalSpent - totalBudgeted)} over`}
              </span>
              <span className={`text-sm font-semibold ${budgetPercent > 100 ? "text-error" : budgetPercent > 80 ? "text-warning" : ""}`}>
                {budgetPercent}%
              </span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
                className={`h-full rounded-full ${budgetPercent > 100 ? "bg-error" : budgetPercent > 80 ? "bg-warning" : "bg-success"}`}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Desktop Summary */}
      {categoriesWithBudgets.length > 0 && (
        <Card className="hidden md:block">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalBudgeted)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className={`text-2xl font-semibold tabular-nums ${totalSpent > totalBudgeted ? "text-error" : ""}`}>
                  {formatCurrency(totalSpent)}
                </p>
              </div>
            </div>
            <Progress value={Math.min((totalSpent / totalBudgeted) * 100, 100)} className="h-2" indicatorClassName={totalSpent > totalBudgeted ? "bg-error" : "bg-success"} />
            <p className="text-sm text-muted-foreground mt-2">
              {totalSpent <= totalBudgeted ? `${formatCurrency(totalBudgeted - totalSpent)} remaining` : `${formatCurrency(totalSpent - totalBudgeted)} over budget`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Budget List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 bg-border rounded" />
                    <div className="h-4 w-20 bg-border rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {categoriesWithBudgets.length > 0 && (
            <Card>
              <CardHeader className="pb-2 hidden md:block">
                <CardTitle className="text-base font-medium">Active Budgets</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {categoriesWithBudgets.map((item) => {
                    const percentage = item.monthlyLimit ? (item.spent / item.monthlyLimit) * 100 : 0;
                    const isOverBudget = percentage > 100;
                    const isNearLimit = percentage >= 80 && percentage <= 100;

                    return (
                      <div key={item.categoryId} className="p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: item.categoryColor }} />
                            <span className="font-medium text-sm sm:text-base">{item.categoryName}</span>
                          </div>
                          {editingCategory === item.categoryId ? (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e, item.categoryId)} className="w-20 sm:w-24 h-8 text-right text-sm" autoFocus />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(item.categoryId)}><Check className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCategory(null)}><X className="w-4 h-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm tabular-nums">{formatCurrency(item.spent)} / {formatCurrency(item.monthlyLimit!)}</span>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item.categoryId, item.monthlyLimit)}><Pencil className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-error active:text-error" onClick={() => handleDelete(item.categoryId, item.categoryName)}><X className="w-4 h-4" /></Button>
                            </div>
                          )}
                        </div>
                        <Progress value={Math.min(percentage, 100)} className="h-1.5" indicatorClassName={isOverBudget ? "bg-error" : isNearLimit ? "bg-warning" : "bg-success"} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {categoriesWithoutBudgets.length > 0 && (
            <Card>
              <CardHeader className="pb-2 hidden md:block">
                <CardTitle className="text-base font-medium">Unbudgeted Spending</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-xs text-muted-foreground px-3 pt-3 md:hidden">Unbudgeted</p>
                <div className="divide-y divide-border">
                  {categoriesWithoutBudgets.map((item) => (
                    <div key={item.categoryId} className="p-3 sm:p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: item.categoryColor }} />
                        <span className="font-medium text-sm sm:text-base">{item.categoryName}</span>
                      </div>
                      {editingCategory === item.categoryId ? (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e, item.categoryId)} className="w-20 sm:w-24 h-8 text-right text-sm" placeholder="Budget" autoFocus />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(item.categoryId)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCategory(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm tabular-nums text-muted-foreground">{formatCurrency(item.spent)}</span>
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => handleEdit(item.categoryId, null)}>Set</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {categoriesWithBudgets.length === 0 && categoriesWithoutBudgets.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No spending data for this month. Import transactions to start tracking budgets.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Remove Budget"
        description={`Are you sure you want to remove the budget for "${deleteConfirm?.categoryName}"?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

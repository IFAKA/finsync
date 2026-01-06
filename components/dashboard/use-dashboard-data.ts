"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useTransactions,
  useCategories,
  useAvailableMonths,
  useBudgets,
  useMonthlySummary,
  useTransactionCount,
  type LocalCategory,
} from "@/lib/hooks/db";

export interface BudgetItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetId: string | null;
  monthlyLimit: number | null;
  spent: number;
}

export function useDashboardData() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const { data: availableMonths } = useAvailableMonths();
  const { data: transactionCount } = useTransactionCount(selectedMonth || undefined);
  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(selectedMonth || "");
  const { data: budgets } = useBudgets(selectedMonth || undefined);
  const { data: transactions } = useTransactions({
    month: selectedMonth || undefined,
    limit: 50,
  });

  // Default to most recent month
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Calculate budget data per category
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

  // Count items needing attention
  const attentionCount = transactions.filter((t) => !t.categoryId || t.needsReview).length;

  // Chart data for spending by category
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

  // Top spending categories for mobile view
  const topCategories = useMemo(() => {
    return summary.byCategory
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
  }, [summary.byCategory, categories]);

  // Budget totals
  const budgetUsed = budgetData.reduce((acc, b) => acc + b.spent, 0);
  const budgetTotal = budgetData.reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);
  const budgetPercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  return {
    selectedMonth,
    setSelectedMonth,
    categories,
    availableMonths,
    transactionCount,
    summary,
    summaryLoading,
    budgets,
    transactions,
    budgetData,
    attentionCount,
    chartData,
    topCategories,
    budgetUsed,
    budgetTotal,
    budgetPercent,
  };
}

export function getCategoryInfo(categories: LocalCategory[], categoryId?: string) {
  if (!categoryId) return { name: "Uncategorized", color: "#888" };
  const category = categories.find((c) => c.id === categoryId);
  return category ? { name: category.name, color: category.color } : { name: "Unknown", color: "#888" };
}

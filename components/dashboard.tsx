"use client";

import { toast } from "sonner";
import { useTransactionMutations } from "@/lib/hooks/db";
import { playSound } from "@/lib/sounds";
import {
  BentoMobileDashboard,
  DesktopDashboard,
  useDashboardData,
} from "./dashboard/index";

interface DashboardProps {
  onUploadClick: () => void;
}

export function Dashboard({ onUploadClick }: DashboardProps) {
  const {
    selectedMonth,
    setSelectedMonth,
    categories,
    availableMonths,
    transactionCount,
    summary,
    summaryLoading,
    transactions,
    budgetData,
    attentionCount,
    chartData,
    topCategories,
    budgetPercent,
    budgetTotal,
  } = useDashboardData();

  const { update: updateTransaction } = useTransactionMutations();

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    try {
      await updateTransaction(transactionId, { categoryId });
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
        transactionCount={transactionCount}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        onUploadClick={onUploadClick}
        onMonthChange={setSelectedMonth}
        categories={categories}
        topCategories={topCategories}
        budgetPercent={budgetPercent}
        budgetTotal={budgetTotal}
      />

      <DesktopDashboard
        summary={summary}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        onUploadClick={onUploadClick}
        onMonthChange={setSelectedMonth}
        categories={categories}
        transactions={transactions}
        chartData={chartData}
        attentionCount={attentionCount}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  );
}

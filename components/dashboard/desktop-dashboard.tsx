"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  List,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SpendingBarChart } from "@/components/spending-chart";
import {
  AnimatedNumber,
  MotionButton,
  FadeIn,
  StaggerItem,
  playSound,
} from "@/components/motion";
import { MonthNavigator } from "@/components/month-navigator";
import type { LocalCategory, LocalTransaction } from "@/lib/hooks/db";
import { getCategoryInfo } from "./use-dashboard-data";

interface DesktopDashboardProps {
  summary: {
    income: number;
    expenses: number;
    savings: number;
    byCategory: Array<{ categoryId: string; amount: number }>;
  };
  selectedMonth: string | null;
  availableMonths: string[];
  onUploadClick: () => void;
  onMonthChange: (month: string) => void;
  categories: LocalCategory[];
  transactions: LocalTransaction[];
  chartData: Array<{
    categoryId: string;
    categoryName: string | null;
    categoryColor: string | null;
    total: number;
    isExpense: boolean;
  }>;
  attentionCount: number;
  onCategoryChange: (transactionId: string, categoryId: string) => void;
}

export function DesktopDashboard({
  summary,
  selectedMonth,
  availableMonths,
  onUploadClick,
  onMonthChange,
  categories,
  transactions,
  chartData,
  attentionCount,
  onCategoryChange,
}: DesktopDashboardProps) {
  const router = useRouter();

  const handleCategoryClick = (categoryId: string | number | null) => {
    if (!categoryId) return;
    const params = new URLSearchParams();
    params.set("category", String(categoryId));
    if (selectedMonth) params.set("month", selectedMonth);
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <div className="hidden md:block space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <MonthNavigator
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
            onNavigate={onMonthChange}
            variant="desktop"
          />
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
          <MotionButton
            size="sm"
            variant="secondary"
            sound="click"
            onClick={onUploadClick}
          >
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
              <p
                className={`text-2xl font-semibold ${
                  summary.savings >= 0 ? "text-success" : "text-error"
                }`}
              >
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
                          <span className="text-sm truncate">{t.description}</span>
                        </div>
                        <span
                          className={`text-sm tabular-nums font-medium shrink-0 ${
                            t.amount >= 0 ? "text-success" : ""
                          }`}
                        >
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
        <NeedsAttentionSection
          transactions={transactions}
          categories={categories}
          attentionCount={attentionCount}
          selectedMonth={selectedMonth}
          onCategoryChange={onCategoryChange}
        />
      )}
    </div>
  );
}

function NeedsAttentionSection({
  transactions,
  categories,
  attentionCount,
  selectedMonth,
  onCategoryChange,
}: {
  transactions: LocalTransaction[];
  categories: LocalCategory[];
  attentionCount: number;
  selectedMonth: string | null;
  onCategoryChange: (transactionId: string, categoryId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Needs Attention
            <span className="text-sm font-normal text-muted-foreground">
              ({attentionCount})
            </span>
          </CardTitle>
          <Link
            href={`/transactions?attention=true${selectedMonth ? `&month=${selectedMonth}` : ''}`}
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
              const catInfo = getCategoryInfo(categories, t.categoryId);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0 flex-1">
                    <span className="text-xs sm:text-sm text-muted-foreground w-auto sm:w-16 shrink-0">
                      {formatDate(t.date)}
                    </span>
                    <span className="text-sm truncate">{t.description}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Select
                      value={t.categoryId || ""}
                      onValueChange={(value) => onCategoryChange(t.id, value)}
                    >
                      <SelectTrigger
                        className="h-7 text-xs w-auto min-w-[100px] border-l-2"
                        style={{ borderLeftColor: catInfo.color }}
                      >
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span
                      className={`text-sm tabular-nums font-medium min-w-[70px] text-right ${
                        t.amount >= 0 ? "text-success" : ""
                      }`}
                    >
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
  );
}

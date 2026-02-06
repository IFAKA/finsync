"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, Plus, Check, X, ChevronRight, Calendar, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useTransactions,
  useRecurringPatterns,
  useRecurringPatternMutations,
  useBudgets,
} from "@/lib/hooks/db";
import { formatCurrency } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import {
  generateForecast,
  getForecastSummary,
  detectRecurringPatterns,
  estimateMonthlyRecurring,
  type MonthlyForecast,
} from "@/lib/planning";
import { PatternDetectionModal } from "./pattern-detection-modal";
import { RecurringPatternModal } from "./recurring-pattern-modal";

// Compact currency format for chart axes
function formatCompactCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000) {
    return `${amount < 0 ? '-' : ''}${(absAmount / 1000).toFixed(1)}k`;
  }
  return amount.toFixed(0);
}

export function ForecastTab() {
  const [showDetectionModal, setShowDetectionModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);

  const { data: transactions } = useTransactions();
  const { data: recurringPatterns, isLoading } = useRecurringPatterns({ isActive: true });
  const { data: budgets } = useBudgets();

  // Generate 12-month forecast
  const forecasts = useMemo(() => {
    const now = new Date();
    const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return generateForecast({
      startMonth,
      months: 12,
      recurringPatterns,
      historicalTransactions: transactions,
      budgets,
    });
  }, [recurringPatterns, transactions, budgets]);

  const summary = useMemo(() => getForecastSummary(forecasts), [forecasts]);
  const monthlyRecurring = useMemo(
    () => estimateMonthlyRecurring(
      recurringPatterns.map(p => ({
        name: p.name,
        type: p.type,
        amount: p.amount,
        frequency: p.frequency,
        categoryId: p.categoryId,
        descriptionPattern: p.descriptionPattern || '',
        confidence: p.confidence,
        matchingTransactions: [],
        lastDate: p.lastDate || new Date(),
        nextDate: p.nextDate || new Date(),
      }))
    ),
    [recurringPatterns]
  );

  // Detect patterns from transactions
  const detectedPatterns = useMemo(() => {
    if (transactions.length < 10) return [];
    return detectRecurringPatterns(transactions);
  }, [transactions]);

  // Filter out patterns that are already tracked
  const newPatterns = useMemo(() => {
    const existingDescriptions = new Set(
      recurringPatterns.map(p => p.descriptionPattern?.toLowerCase() || p.name.toLowerCase())
    );
    return detectedPatterns.filter(p =>
      !existingDescriptions.has(p.descriptionPattern.toLowerCase())
    );
  }, [detectedPatterns, recurringPatterns]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-4 h-48" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="p-4 h-32" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Avg Monthly Savings</span>
            </div>
            <p className={`text-xl font-semibold tabular-nums ${summary.avgMonthlySavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(summary.avgMonthlySavings)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recurring/mo</span>
            </div>
            <p className="text-xl font-semibold tabular-nums">
              <span className="text-success">+{formatCurrency(monthlyRecurring.income)}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-destructive">-{formatCurrency(monthlyRecurring.expenses)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span>12-Month Forecast</span>
            <span className="text-sm font-normal text-muted-foreground">
              Savings rate: {summary.savingsRate.toFixed(1)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ForecastChart forecasts={forecasts} />
        </CardContent>
      </Card>

      {/* Detected Patterns Alert */}
      {newPatterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Patterns Detected</p>
                    <p className="text-sm text-muted-foreground">
                      {newPatterns.length} recurring {newPatterns.length === 1 ? 'transaction' : 'transactions'} found
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowDetectionModal(true)} size="sm">
                  Review
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recurring Patterns List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Recurring Transactions</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setShowPatternModal(true)} aria-label="Add recurring transaction">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recurringPatterns.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No recurring patterns tracked yet.
              {transactions.length >= 10 && newPatterns.length > 0
                ? " Review detected patterns above."
                : " Add patterns manually or import more transactions."}
            </div>
          ) : (
            <div className="divide-y">
              {recurringPatterns.map(pattern => (
                <RecurringPatternRow key={pattern.id} pattern={pattern} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <PatternDetectionModal
        open={showDetectionModal}
        onOpenChange={setShowDetectionModal}
        patterns={newPatterns}
      />

      <RecurringPatternModal
        open={showPatternModal}
        onOpenChange={setShowPatternModal}
      />
    </div>
  );
}

interface ForecastChartProps {
  forecasts: MonthlyForecast[];
}

function ForecastChart({ forecasts }: ForecastChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 200 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 200,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (forecasts.length === 0 || dimensions.width === 0) {
    return <div ref={containerRef} className="h-[200px] flex items-center justify-center text-muted-foreground">
      No forecast data available
    </div>;
  }

  const { width, height } = dimensions;
  const padding = { top: 20, right: 10, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const maxIncome = Math.max(...forecasts.map(f => f.projectedIncome));
  const maxExpense = Math.max(...forecasts.map(f => f.projectedExpenses));
  const minSavings = Math.min(...forecasts.map(f => f.projectedSavings));
  const maxValue = Math.max(maxIncome, maxExpense);
  const minValue = Math.min(0, minSavings);
  const yRange = maxValue - minValue;

  const xScale = (i: number) => padding.left + (i / (forecasts.length - 1)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - ((v - minValue) / yRange) * chartHeight;

  // Generate path data
  const incomePath = forecasts.map((f, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(f.projectedIncome)}`).join(' ');
  const expensePath = forecasts.map((f, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(f.projectedExpenses)}`).join(' ');
  const savingsPath = forecasts.map((f, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(f.projectedSavings)}`).join(' ');

  return (
    <div ref={containerRef} className="relative">
      <svg width={width} height={height} role="img" aria-label="12-month financial forecast chart showing projected income, expenses, and savings">
        {/* Grid lines */}
        <g className="text-border">
          {[0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke="currentColor"
              strokeDasharray="4 4"
              opacity={0.3}
            />
          ))}
        </g>

        {/* Zero line */}
        {minValue < 0 && (
          <line
            x1={padding.left}
            y1={yScale(0)}
            x2={width - padding.right}
            y2={yScale(0)}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />
        )}

        {/* Lines */}
        <motion.path
          d={incomePath}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <motion.path
          d={expensePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
        <motion.path
          d={savingsPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
        />

        {/* X-axis labels */}
        {forecasts.map((f, i) => {
          if (i % 2 !== 0) return null;
          const [, month] = f.month.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return (
            <text
              key={f.month}
              x={xScale(i)}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground"
            >
              {monthNames[parseInt(month) - 1]}
            </text>
          );
        })}

        {/* Y-axis labels */}
        <text
          x={padding.left - 8}
          y={padding.top}
          textAnchor="end"
          className="text-[10px] fill-muted-foreground"
        >
          {formatCompactCurrency(maxValue)}
        </text>
        <text
          x={padding.left - 8}
          y={height - padding.bottom}
          textAnchor="end"
          className="text-[10px] fill-muted-foreground"
        >
          {formatCompactCurrency(minValue)}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-success" />
          <span className="text-muted-foreground">Income</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-destructive" />
          <span className="text-muted-foreground">Expenses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary border-dashed" />
          <span className="text-muted-foreground">Savings</span>
        </div>
      </div>
    </div>
  );
}

interface RecurringPatternRowProps {
  pattern: {
    id: string;
    name: string;
    type: 'expense' | 'income';
    amount: number;
    frequency: string;
    nextDate?: Date;
    isActive: boolean;
  };
}

function RecurringPatternRow({ pattern }: RecurringPatternRowProps) {
  const { update, remove } = useRecurringPatternMutations();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async () => {
    try {
      await update(pattern.id, { isActive: !pattern.isActive });
      playSound("toggle");
    } catch {
      toast.error("Failed to update pattern");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await remove(pattern.id);
      toast.success("Pattern removed");
      playSound("toggle");
    } catch {
      toast.error("Failed to remove pattern");
      playSound("error");
    }
    setIsDeleting(false);
  };

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  return (
    <motion.div
      layout
      className="p-3 flex items-center gap-3"
      animate={{ opacity: pattern.isActive ? 1 : 0.5 }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        pattern.type === 'income' ? 'bg-success/20' : 'bg-destructive/20'
      }`}>
        {pattern.type === 'income' ? (
          <TrendingUp className="w-4 h-4 text-success" />
        ) : (
          <TrendingDown className="w-4 h-4 text-destructive" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">{pattern.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{frequencyLabels[pattern.frequency] || pattern.frequency}</span>
          {pattern.nextDate && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Next: {new Date(pattern.nextDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>
      </div>

      <p className={`font-medium tabular-nums text-sm ${
        pattern.type === 'income' ? 'text-success' : 'text-destructive'
      }`}>
        {pattern.type === 'income' ? '+' : '-'}{formatCurrency(pattern.amount)}
      </p>

      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 min-h-[44px] sm:min-h-0"
          onClick={handleToggle}
          aria-label={pattern.isActive ? `Disable ${pattern.name}` : `Enable ${pattern.name}`}
        >
          {pattern.isActive ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <X className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 min-h-[44px] sm:min-h-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${pattern.name}`}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

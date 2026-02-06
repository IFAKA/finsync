import { type LocalTransaction, type LocalRecurringPattern, type LocalBudget } from "@/lib/db/schema";
import { getMonthlyEquivalent } from "./recurring-detection";

export interface MonthlyForecast {
  month: string; // "YYYY-MM"
  projectedIncome: number;
  projectedExpenses: number;
  projectedSavings: number;
  recurringIncome: number;
  recurringExpenses: number;
  variableExpenses: number;
  confidence: number; // 0-1, decreases further into future
}

export interface ForecastConfig {
  startMonth: string;
  months: number;
  recurringPatterns: LocalRecurringPattern[];
  historicalTransactions: LocalTransaction[];
  budgets: LocalBudget[];
}

// Get month string for a date
function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Parse month string to Date
function parseMonth(monthStr: string): Date {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

// Add months to a month string
function addMonths(monthStr: string, count: number): string {
  const date = parseMonth(monthStr);
  date.setMonth(date.getMonth() + count);
  return getMonthString(date);
}

// Calculate historical averages by category
function calculateHistoricalAverages(
  transactions: LocalTransaction[],
  monthsBack: number = 6
): { categoryExpenses: Map<string, number>; totalExpenses: number; totalIncome: number } {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const filtered = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= cutoff && txDate <= now;
  });

  const categoryTotals = new Map<string, number>();
  let totalExpenses = 0;
  let totalIncome = 0;

  for (const tx of filtered) {
    if (tx.amount < 0) {
      totalExpenses += Math.abs(tx.amount);
      if (tx.categoryId) {
        const current = categoryTotals.get(tx.categoryId) || 0;
        categoryTotals.set(tx.categoryId, current + Math.abs(tx.amount));
      }
    } else {
      totalIncome += tx.amount;
    }
  }

  // Convert to monthly averages
  const monthsCount = Math.min(monthsBack, getUniqueMonthsCount(filtered));
  const avgMultiplier = monthsCount > 0 ? 1 / monthsCount : 0;

  const categoryExpenses = new Map<string, number>();
  for (const [catId, total] of categoryTotals) {
    categoryExpenses.set(catId, total * avgMultiplier);
  }

  return {
    categoryExpenses,
    totalExpenses: totalExpenses * avgMultiplier,
    totalIncome: totalIncome * avgMultiplier,
  };
}

// Get count of unique months in transactions
function getUniqueMonthsCount(transactions: LocalTransaction[]): number {
  const months = new Set<string>();
  for (const tx of transactions) {
    months.add(getMonthString(new Date(tx.date)));
  }
  return months.size;
}

// Calculate recurring totals for a month
function calculateRecurringForMonth(
  patterns: LocalRecurringPattern[],
  _monthStr: string
): { income: number; expenses: number } {
  let income = 0;
  let expenses = 0;

  for (const pattern of patterns) {
    if (!pattern.isActive) continue;

    const monthlyAmount = getMonthlyEquivalent(pattern.amount, pattern.frequency);

    if (pattern.type === 'income') {
      income += monthlyAmount;
    } else {
      expenses += monthlyAmount;
    }
  }

  return { income, expenses };
}

// Generate month-by-month forecast
export function generateForecast(config: ForecastConfig): MonthlyForecast[] {
  const { startMonth, months, recurringPatterns, historicalTransactions, budgets } = config;

  const historicalAverages = calculateHistoricalAverages(historicalTransactions);
  const forecasts: MonthlyForecast[] = [];

  for (let i = 0; i < months; i++) {
    const month = addMonths(startMonth, i);
    const recurring = calculateRecurringForMonth(recurringPatterns, month);

    // Calculate variable expenses (non-recurring)
    // Use budgets if available, otherwise historical averages
    let variableExpenses = 0;
    const monthBudgets = budgets.filter(b => b.month === month);

    if (monthBudgets.length > 0) {
      variableExpenses = monthBudgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
      // Subtract recurring that might be in budgeted categories
      variableExpenses = Math.max(0, variableExpenses - recurring.expenses * 0.5);
    } else {
      // Use historical average minus recurring
      variableExpenses = Math.max(0, historicalAverages.totalExpenses - recurring.expenses);
    }

    // Confidence decreases further into future
    const confidence = Math.max(0.3, 1 - (i * 0.1));

    const projectedExpenses = recurring.expenses + variableExpenses;
    const projectedIncome = recurring.income || historicalAverages.totalIncome;
    const projectedSavings = projectedIncome - projectedExpenses;

    forecasts.push({
      month,
      projectedIncome,
      projectedExpenses,
      projectedSavings,
      recurringIncome: recurring.income,
      recurringExpenses: recurring.expenses,
      variableExpenses,
      confidence,
    });
  }

  return forecasts;
}

// Calculate cumulative savings projection
export function calculateCumulativeSavings(
  forecasts: MonthlyForecast[],
  startingBalance: number = 0
): { month: string; balance: number }[] {
  let balance = startingBalance;
  return forecasts.map(f => {
    balance += f.projectedSavings;
    return { month: f.month, balance };
  });
}

// Estimate when a savings goal will be reached
export function estimateGoalCompletion(
  forecasts: MonthlyForecast[],
  targetAmount: number,
  currentAmount: number
): { month: string; isAchievable: boolean } | null {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) {
    return { month: forecasts[0]?.month || getMonthString(new Date()), isAchievable: true };
  }

  let accumulated = 0;
  for (const forecast of forecasts) {
    if (forecast.projectedSavings > 0) {
      accumulated += forecast.projectedSavings;
      if (accumulated >= remaining) {
        return { month: forecast.month, isAchievable: true };
      }
    }
  }

  // Check if we're making progress
  const avgMonthlySavings = forecasts.reduce((sum, f) => sum + f.projectedSavings, 0) / forecasts.length;
  if (avgMonthlySavings <= 0) {
    return null; // Goal not achievable with current spending
  }

  // Estimate month even if beyond forecast window
  const monthsNeeded = Math.ceil(remaining / avgMonthlySavings);
  const estimatedMonth = addMonths(forecasts[0].month, monthsNeeded);
  return { month: estimatedMonth, isAchievable: true };
}

// Get forecast summary statistics
export function getForecastSummary(forecasts: MonthlyForecast[]): {
  avgMonthlySavings: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  totalProjectedSavings: number;
  savingsRate: number;
} {
  if (forecasts.length === 0) {
    return {
      avgMonthlySavings: 0,
      avgMonthlyIncome: 0,
      avgMonthlyExpenses: 0,
      totalProjectedSavings: 0,
      savingsRate: 0,
    };
  }

  const totalIncome = forecasts.reduce((sum, f) => sum + f.projectedIncome, 0);
  const totalExpenses = forecasts.reduce((sum, f) => sum + f.projectedExpenses, 0);
  const totalSavings = forecasts.reduce((sum, f) => sum + f.projectedSavings, 0);

  return {
    avgMonthlySavings: totalSavings / forecasts.length,
    avgMonthlyIncome: totalIncome / forecasts.length,
    avgMonthlyExpenses: totalExpenses / forecasts.length,
    totalProjectedSavings: totalSavings,
    savingsRate: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0,
  };
}

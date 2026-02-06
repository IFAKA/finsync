import { type LocalTransaction, type RecurringFrequency } from "@/lib/db/schema";

export interface DetectedPattern {
  name: string;
  type: 'expense' | 'income';
  amount: number;
  frequency: RecurringFrequency;
  categoryId?: string;
  descriptionPattern: string;
  confidence: number;
  matchingTransactions: LocalTransaction[];
  lastDate: Date;
  nextDate: Date;
}

interface TransactionGroup {
  descriptionPattern: string;
  transactions: LocalTransaction[];
  averageAmount: number;
  categoryId?: string;
}

// Normalize description for pattern matching
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\d{2,}/g, '') // Remove numbers (dates, IDs)
    .replace(/\s+/g, ' ')
    .trim();
}

// Group transactions by similar descriptions
function groupByDescription(transactions: LocalTransaction[]): TransactionGroup[] {
  const groups = new Map<string, LocalTransaction[]>();

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description);
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(tx);
  }

  const result: TransactionGroup[] = [];
  for (const [pattern, txs] of groups.entries()) {
    if (txs.length >= 2) { // At least 2 occurrences
      const total = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      result.push({
        descriptionPattern: pattern,
        transactions: txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        averageAmount: total / txs.length,
        categoryId: txs[0].categoryId, // Use most recent category
      });
    }
  }

  return result;
}

// Calculate days between dates
function daysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}

// Detect frequency from intervals
function detectFrequency(intervals: number[]): { frequency: RecurringFrequency; confidence: number } | null {
  if (intervals.length === 0) return null;

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const stdDev = Math.sqrt(
    intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
  );

  // Allowed variance as percentage of expected interval
  const varianceRatio = stdDev / avgInterval;

  // Weekly: ~7 days (±2)
  if (avgInterval >= 5 && avgInterval <= 9 && varianceRatio < 0.3) {
    return { frequency: 'weekly', confidence: Math.max(0.5, 1 - varianceRatio) };
  }

  // Biweekly: ~14 days (±3)
  if (avgInterval >= 11 && avgInterval <= 17 && varianceRatio < 0.25) {
    return { frequency: 'biweekly', confidence: Math.max(0.5, 1 - varianceRatio) };
  }

  // Monthly: ~30 days (±5)
  if (avgInterval >= 25 && avgInterval <= 35 && varianceRatio < 0.2) {
    return { frequency: 'monthly', confidence: Math.max(0.5, 1 - varianceRatio) };
  }

  // Quarterly: ~90 days (±15)
  if (avgInterval >= 75 && avgInterval <= 105 && varianceRatio < 0.2) {
    return { frequency: 'quarterly', confidence: Math.max(0.4, 0.9 - varianceRatio) };
  }

  // Yearly: ~365 days (±30)
  if (avgInterval >= 335 && avgInterval <= 395 && varianceRatio < 0.15) {
    return { frequency: 'yearly', confidence: Math.max(0.4, 0.9 - varianceRatio) };
  }

  return null;
}

// Calculate next expected date
function calculateNextDate(lastDate: Date, frequency: RecurringFrequency): Date {
  const next = new Date(lastDate);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// Check if amounts are consistent (within 10% variance)
function areAmountsConsistent(amounts: number[]): boolean {
  if (amounts.length < 2) return true;
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  return amounts.every(a => Math.abs(a - avg) / avg < 0.1);
}

// Main detection function
export function detectRecurringPatterns(transactions: LocalTransaction[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const groups = groupByDescription(transactions);

  for (const group of groups) {
    if (group.transactions.length < 2) continue;

    // Calculate intervals between transactions
    const dates = group.transactions.map(tx => new Date(tx.date));
    const intervals: number[] = [];
    for (let i = 0; i < dates.length - 1; i++) {
      intervals.push(daysBetween(dates[i], dates[i + 1]));
    }

    // Detect frequency
    const frequencyResult = detectFrequency(intervals);
    if (!frequencyResult) continue;

    // Check amount consistency
    const amounts = group.transactions.map(tx => Math.abs(tx.amount));
    if (!areAmountsConsistent(amounts)) {
      // Reduce confidence if amounts vary
      frequencyResult.confidence *= 0.7;
    }

    // Must have reasonable confidence
    if (frequencyResult.confidence < 0.4) continue;

    const lastDate = dates[0];
    const nextDate = calculateNextDate(lastDate, frequencyResult.frequency);

    // Determine if expense or income
    const type = group.averageAmount < 0 || group.transactions[0].amount < 0 ? 'expense' : 'income';

    patterns.push({
      name: group.transactions[0].description,
      type,
      amount: Math.abs(group.averageAmount),
      frequency: frequencyResult.frequency,
      categoryId: group.categoryId,
      descriptionPattern: group.descriptionPattern,
      confidence: frequencyResult.confidence,
      matchingTransactions: group.transactions,
      lastDate,
      nextDate,
    });
  }

  // Sort by confidence (highest first)
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// Get upcoming recurring expenses for the next N days
export function getUpcomingRecurring(
  patterns: DetectedPattern[],
  days: number = 30
): { pattern: DetectedPattern; dueDate: Date }[] {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const upcoming: { pattern: DetectedPattern; dueDate: Date }[] = [];

  for (const pattern of patterns) {
    let nextDate = new Date(pattern.nextDate);

    // Find all occurrences within the window
    while (nextDate <= cutoff) {
      if (nextDate >= now) {
        upcoming.push({ pattern, dueDate: new Date(nextDate) });
      }
      nextDate = calculateNextDate(nextDate, pattern.frequency);
    }
  }

  // Sort by date
  return upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// Estimate monthly recurring total
export function estimateMonthlyRecurring(patterns: DetectedPattern[]): {
  expenses: number;
  income: number;
  net: number;
} {
  let expenses = 0;
  let income = 0;

  for (const pattern of patterns) {
    const monthlyAmount = getMonthlyEquivalent(pattern.amount, pattern.frequency);
    if (pattern.type === 'expense') {
      expenses += monthlyAmount;
    } else {
      income += monthlyAmount;
    }
  }

  return {
    expenses,
    income,
    net: income - expenses,
  };
}

// Convert any frequency to monthly equivalent
export function getMonthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'weekly':
      return amount * 4.33; // ~4.33 weeks per month
    case 'biweekly':
      return amount * 2.17;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
  }
}

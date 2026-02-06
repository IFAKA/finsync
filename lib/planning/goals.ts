import { type LocalSavingsGoal, type LocalGoalContribution, type LocalTransaction } from "@/lib/db/schema";
import { type MonthlyForecast, estimateGoalCompletion } from "./forecast";

export interface GoalProgress {
  goal: LocalSavingsGoal;
  currentAmount: number;
  targetAmount: number;
  percentComplete: number;
  remainingAmount: number;
  estimatedCompletionDate: string | null;
  isOnTrack: boolean;
  monthlyRequired: number; // Amount needed per month to reach goal on time
  daysRemaining: number | null;
  status: 'on_track' | 'behind' | 'ahead' | 'completed' | 'no_deadline';
}

// Calculate goal progress and status
export function calculateGoalProgress(
  goal: LocalSavingsGoal,
  _contributions: LocalGoalContribution[],
  forecasts: MonthlyForecast[]
): GoalProgress {
  const currentAmount = goal.currentAmount;
  const targetAmount = goal.targetAmount;
  const percentComplete = Math.min(100, (currentAmount / targetAmount) * 100);
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  // If goal is already complete
  if (remainingAmount <= 0) {
    return {
      goal,
      currentAmount,
      targetAmount,
      percentComplete: 100,
      remainingAmount: 0,
      estimatedCompletionDate: null,
      isOnTrack: true,
      monthlyRequired: 0,
      daysRemaining: null,
      status: 'completed',
    };
  }

  // Calculate estimated completion based on forecasts
  const completionEstimate = estimateGoalCompletion(forecasts, targetAmount, currentAmount);
  const estimatedCompletionDate = completionEstimate?.month || null;

  // Calculate days remaining if there's a target date
  let daysRemaining: number | null = null;
  let monthlyRequired = 0;
  let status: GoalProgress['status'] = 'no_deadline';
  let isOnTrack = true;

  if (goal.targetDate) {
    const targetDate = new Date(goal.targetDate);
    const now = new Date();
    const msRemaining = targetDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // Calculate monthly required to meet deadline
    const monthsRemaining = daysRemaining / 30;
    monthlyRequired = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;

    // Determine if on track
    if (estimatedCompletionDate) {
      const estimatedDate = parseMonthToDate(estimatedCompletionDate);
      if (estimatedDate <= targetDate) {
        // Check if we're ahead
        const avgMonthlySavings = forecasts.reduce((sum, f) => sum + f.projectedSavings, 0) / forecasts.length;
        if (avgMonthlySavings > monthlyRequired * 1.1) {
          status = 'ahead';
        } else {
          status = 'on_track';
        }
        isOnTrack = true;
      } else {
        status = 'behind';
        isOnTrack = false;
      }
    } else {
      // Can't reach goal with current projections
      status = 'behind';
      isOnTrack = false;
    }
  }

  return {
    goal,
    currentAmount,
    targetAmount,
    percentComplete,
    remainingAmount,
    estimatedCompletionDate,
    isOnTrack,
    monthlyRequired,
    daysRemaining,
    status,
  };
}

// Parse "YYYY-MM" to Date
function parseMonthToDate(monthStr: string): Date {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

// Calculate auto-tracked goal amount from category transactions
export function calculateAutoTrackedAmount(
  goal: LocalSavingsGoal,
  transactions: LocalTransaction[],
  contributions: LocalGoalContribution[]
): number {
  if (goal.trackingMode !== 'auto' || !goal.categoryId) {
    // Manual tracking: sum contributions
    return contributions.reduce((sum, c) => sum + c.amount, 0);
  }

  // Auto tracking: sum positive transactions in the linked category
  // (e.g., transfers to savings account)
  return transactions
    .filter(tx => tx.categoryId === goal.categoryId && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// Get contribution history with running total
export function getContributionHistory(
  contributions: LocalGoalContribution[]
): { contribution: LocalGoalContribution; runningTotal: number }[] {
  const sorted = [...contributions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningTotal = 0;
  return sorted.map(contribution => {
    runningTotal += contribution.amount;
    return { contribution, runningTotal };
  });
}

// Suggest monthly contribution to meet goal
export function suggestMonthlyContribution(
  goal: LocalSavingsGoal,
  currentAmount: number
): number | null {
  if (!goal.targetDate) return null;

  const remaining = goal.targetAmount - currentAmount;
  if (remaining <= 0) return 0;

  const targetDate = new Date(goal.targetDate);
  const now = new Date();
  const monthsRemaining = Math.max(
    1,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth())
  );

  return Math.ceil(remaining / monthsRemaining);
}

// Calculate how much faster goal can be reached with extra contribution
export function calculateAcceleratedCompletion(
  goal: LocalSavingsGoal,
  currentAmount: number,
  extraMonthlyAmount: number,
  forecasts: MonthlyForecast[]
): string | null {
  const remaining = goal.targetAmount - currentAmount;
  if (remaining <= 0) return null;

  // Get current monthly savings rate from forecasts
  const avgMonthlySavings = forecasts.length > 0
    ? forecasts.reduce((sum, f) => sum + Math.max(0, f.projectedSavings), 0) / forecasts.length
    : 0;

  const newMonthlySavings = avgMonthlySavings + extraMonthlyAmount;
  if (newMonthlySavings <= 0) return null;

  const monthsNeeded = Math.ceil(remaining / newMonthlySavings);
  const now = new Date();
  const completionDate = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, 1);

  return `${completionDate.getFullYear()}-${String(completionDate.getMonth() + 1).padStart(2, '0')}`;
}

// Sort goals by priority (urgency + progress)
export function sortGoalsByPriority(goals: GoalProgress[]): GoalProgress[] {
  return [...goals].sort((a, b) => {
    // Completed goals go last
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;

    // Behind goals go first
    if (a.status === 'behind' && b.status !== 'behind') return -1;
    if (b.status === 'behind' && a.status !== 'behind') return 1;

    // Then by days remaining (most urgent first)
    if (a.daysRemaining !== null && b.daysRemaining !== null) {
      return a.daysRemaining - b.daysRemaining;
    }
    if (a.daysRemaining !== null) return -1;
    if (b.daysRemaining !== null) return 1;

    // Finally by percent complete (closer to completion first)
    return b.percentComplete - a.percentComplete;
  });
}

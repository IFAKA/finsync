import {
  type LocalScenario,
  type ScenarioModification,
  type LocalRecurringPattern,
  type LocalTransaction,
  type LocalBudget,
  type LocalSavingsGoal,
} from "@/lib/db/schema";
import { type MonthlyForecast, generateForecast, getForecastSummary } from "./forecast";
import { calculateGoalProgress } from "./goals";

export interface SimulationResult {
  scenario: LocalScenario;
  forecasts: MonthlyForecast[];
  baselineForecasts: MonthlyForecast[];
  comparison: ForecastComparison;
  goalImpacts: GoalImpact[];
}

export interface ForecastComparison {
  totalSavingsDelta: number;
  avgMonthlySavingsDelta: number;
  savingsRateDelta: number;
  monthlyDeltas: MonthlyDelta[];
}

export interface MonthlyDelta {
  month: string;
  incomeDelta: number;
  expensesDelta: number;
  savingsDelta: number;
}

export interface GoalImpact {
  goal: LocalSavingsGoal;
  baselineCompletion: string | null;
  scenarioCompletion: string | null;
  monthsDelta: number | null; // Positive = faster, negative = slower
  isImproved: boolean;
}

// Apply modifications to create modified patterns/budgets
function applyModifications(
  modifications: ScenarioModification[],
  recurringPatterns: LocalRecurringPattern[],
  budgets: LocalBudget[]
): {
  modifiedPatterns: LocalRecurringPattern[];
  modifiedBudgets: LocalBudget[];
  additionalIncome: number;
  additionalExpenses: number;
} {
  const modifiedPatterns = [...recurringPatterns];
  const modifiedBudgets = [...budgets];
  let additionalIncome = 0;
  let additionalExpenses = 0;

  for (const mod of modifications) {
    switch (mod.type) {
      case 'adjust_budget': {
        if (mod.categoryId && mod.amount !== undefined) {
          const budgetIndex = modifiedBudgets.findIndex(b => b.categoryId === mod.categoryId);
          if (budgetIndex >= 0) {
            modifiedBudgets[budgetIndex] = {
              ...modifiedBudgets[budgetIndex],
              monthlyLimit: mod.amount,
            };
          }
        }
        break;
      }

      case 'add_expense': {
        if (mod.amount !== undefined) {
          // Add as monthly recurring expense
          additionalExpenses += mod.amount;
        }
        break;
      }

      case 'remove_expense': {
        if (mod.recurringPatternId) {
          const patternIndex = modifiedPatterns.findIndex(p => p.id === mod.recurringPatternId);
          if (patternIndex >= 0) {
            modifiedPatterns[patternIndex] = {
              ...modifiedPatterns[patternIndex],
              isActive: false,
            };
          }
        } else if (mod.amount !== undefined) {
          additionalExpenses -= mod.amount;
        }
        break;
      }

      case 'add_income': {
        if (mod.amount !== undefined) {
          additionalIncome += mod.amount;
        }
        break;
      }

      case 'adjust_recurring': {
        if (mod.recurringPatternId && mod.amount !== undefined) {
          const patternIndex = modifiedPatterns.findIndex(p => p.id === mod.recurringPatternId);
          if (patternIndex >= 0) {
            modifiedPatterns[patternIndex] = {
              ...modifiedPatterns[patternIndex],
              amount: mod.amount,
            };
          }
        }
        break;
      }
    }
  }

  return {
    modifiedPatterns,
    modifiedBudgets,
    additionalIncome,
    additionalExpenses,
  };
}

// Run a what-if scenario simulation
export function runSimulation(
  scenario: LocalScenario,
  recurringPatterns: LocalRecurringPattern[],
  historicalTransactions: LocalTransaction[],
  budgets: LocalBudget[],
  goals: LocalSavingsGoal[]
): SimulationResult {
  // Generate baseline forecast
  const baselineForecasts = generateForecast({
    startMonth: scenario.baseMonth,
    months: scenario.projectionMonths,
    recurringPatterns,
    historicalTransactions,
    budgets,
  });

  // Apply scenario modifications
  const { modifiedPatterns, modifiedBudgets, additionalIncome, additionalExpenses } =
    applyModifications(scenario.modifications, recurringPatterns, budgets);

  // Generate scenario forecast
  let scenarioForecasts = generateForecast({
    startMonth: scenario.baseMonth,
    months: scenario.projectionMonths,
    recurringPatterns: modifiedPatterns,
    historicalTransactions,
    budgets: modifiedBudgets,
  });

  // Apply additional income/expenses
  if (additionalIncome !== 0 || additionalExpenses !== 0) {
    scenarioForecasts = scenarioForecasts.map(f => ({
      ...f,
      projectedIncome: f.projectedIncome + additionalIncome,
      projectedExpenses: f.projectedExpenses + additionalExpenses,
      projectedSavings: f.projectedSavings + additionalIncome - additionalExpenses,
    }));
  }

  // Calculate comparison
  const comparison = compareForecasts(baselineForecasts, scenarioForecasts);

  // Calculate goal impacts
  const goalImpacts = calculateGoalImpacts(goals, baselineForecasts, scenarioForecasts);

  return {
    scenario,
    forecasts: scenarioForecasts,
    baselineForecasts,
    comparison,
    goalImpacts,
  };
}

// Compare two forecast arrays
function compareForecasts(
  baseline: MonthlyForecast[],
  scenario: MonthlyForecast[]
): ForecastComparison {
  const baselineSummary = getForecastSummary(baseline);
  const scenarioSummary = getForecastSummary(scenario);

  const monthlyDeltas: MonthlyDelta[] = baseline.map((b, i) => {
    const s = scenario[i];
    return {
      month: b.month,
      incomeDelta: s.projectedIncome - b.projectedIncome,
      expensesDelta: s.projectedExpenses - b.projectedExpenses,
      savingsDelta: s.projectedSavings - b.projectedSavings,
    };
  });

  return {
    totalSavingsDelta: scenarioSummary.totalProjectedSavings - baselineSummary.totalProjectedSavings,
    avgMonthlySavingsDelta: scenarioSummary.avgMonthlySavings - baselineSummary.avgMonthlySavings,
    savingsRateDelta: scenarioSummary.savingsRate - baselineSummary.savingsRate,
    monthlyDeltas,
  };
}

// Calculate how scenario affects goal completion
function calculateGoalImpacts(
  goals: LocalSavingsGoal[],
  baselineForecasts: MonthlyForecast[],
  scenarioForecasts: MonthlyForecast[]
): GoalImpact[] {
  return goals.map(goal => {
    const baselineProgress = calculateGoalProgress(goal, [], baselineForecasts);
    const scenarioProgress = calculateGoalProgress(goal, [], scenarioForecasts);

    const baselineCompletion = baselineProgress.estimatedCompletionDate;
    const scenarioCompletion = scenarioProgress.estimatedCompletionDate;

    let monthsDelta: number | null = null;
    let isImproved = false;

    if (baselineCompletion && scenarioCompletion) {
      const baselineMonths = parseMonthToNumber(baselineCompletion);
      const scenarioMonths = parseMonthToNumber(scenarioCompletion);
      monthsDelta = baselineMonths - scenarioMonths; // Positive = faster
      isImproved = monthsDelta > 0;
    } else if (!baselineCompletion && scenarioCompletion) {
      isImproved = true; // Was unachievable, now achievable
    } else if (baselineCompletion && !scenarioCompletion) {
      isImproved = false; // Was achievable, now not
    }

    return {
      goal,
      baselineCompletion,
      scenarioCompletion,
      monthsDelta,
      isImproved,
    };
  });
}

// Convert "YYYY-MM" to months since epoch for comparison
function parseMonthToNumber(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number);
  return year * 12 + month;
}

// Create a quick scenario for common what-if questions
export function createQuickScenario(
  type: 'reduce_expense' | 'add_income' | 'cancel_subscription',
  amount: number,
  baseMonth: string,
  projectionMonths: number = 12,
  recurringPatternId?: string
): Omit<LocalScenario, 'id' | 'serverId' | 'createdAt' | '_lastModified' | '_deleted'> {
  let modifications: ScenarioModification[] = [];
  let name = '';

  switch (type) {
    case 'reduce_expense':
      name = `Reduce expenses by $${amount}/month`;
      modifications = [{
        id: crypto.randomUUID(),
        type: 'remove_expense',
        amount,
      }];
      break;

    case 'add_income':
      name = `Add $${amount}/month income`;
      modifications = [{
        id: crypto.randomUUID(),
        type: 'add_income',
        amount,
      }];
      break;

    case 'cancel_subscription':
      name = `Cancel subscription`;
      modifications = [{
        id: crypto.randomUUID(),
        type: 'remove_expense',
        recurringPatternId,
        amount,
      }];
      break;
  }

  return {
    name,
    baseMonth,
    modifications,
    projectionMonths,
  };
}

// Generate scenario suggestions based on goals
export function suggestScenarios(
  _goals: LocalSavingsGoal[],
  recurringPatterns: LocalRecurringPattern[],
  baseMonth: string
): Omit<LocalScenario, 'id' | 'serverId' | 'createdAt' | '_lastModified' | '_deleted'>[] {
  const suggestions: Omit<LocalScenario, 'id' | 'serverId' | 'createdAt' | '_lastModified' | '_deleted'>[] = [];

  // Suggest canceling subscriptions
  const subscriptions = recurringPatterns.filter(
    p => p.type === 'expense' && p.isActive && p.frequency === 'monthly' && p.amount <= 50
  );

  for (const sub of subscriptions.slice(0, 3)) {
    suggestions.push({
      name: `Cancel ${sub.name}`,
      baseMonth,
      modifications: [{
        id: crypto.randomUUID(),
        type: 'remove_expense',
        recurringPatternId: sub.id,
        amount: sub.amount,
      }],
      projectionMonths: 12,
    });
  }

  // Suggest income increase scenarios
  suggestions.push(
    createQuickScenario('add_income', 500, baseMonth, 12),
    createQuickScenario('add_income', 1000, baseMonth, 12)
  );

  // Suggest expense reduction scenarios
  suggestions.push(
    createQuickScenario('reduce_expense', 100, baseMonth, 12),
    createQuickScenario('reduce_expense', 250, baseMonth, 12)
  );

  return suggestions;
}

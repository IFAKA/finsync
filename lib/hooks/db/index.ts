"use client";

// Re-export all database hooks
export { useDbInit, ensureDbInitialized } from "./use-db-init";
export { useCategories, useCategoryMutations } from "./use-categories";
export {
  useTransactions,
  useTransactionCount,
  useAvailableMonths,
  useTransactionMutations,
  useFindSimilarTransactions,
  useCurrentBalance,
  useMonthlySummary,
} from "./use-transactions";
export { useBudgets, useBudgetMutations } from "./use-budgets";
export { useRules, useRuleMutations } from "./use-rules";

// Planning hooks
export { useSavingsGoals, useSavingsGoalById, useSavingsGoalMutations } from "./use-savings-goals";
export { useRecurringPatterns, useRecurringPatternMutations } from "./use-recurring-patterns";
export { useScenarios, useScenarioById, useScenarioMutations } from "./use-scenarios";
export { useGoalContributions, useGoalContributionMutations } from "./use-goal-contributions";

// Re-export types for convenience
export type {
  LocalCategory,
  LocalTransaction,
  LocalBudget,
  LocalRule,
  LocalSavingsGoal,
  LocalRecurringPattern,
  LocalScenario,
  LocalGoalContribution,
  RecurringFrequency,
  ScenarioModification,
} from "@/lib/db/schema";

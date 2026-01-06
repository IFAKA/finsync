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
  useMonthlySummary,
} from "./use-transactions";
export { useBudgets, useBudgetMutations } from "./use-budgets";
export { useRules, useRuleMutations } from "./use-rules";

// Re-export types for convenience
export type {
  LocalCategory,
  LocalTransaction,
  LocalBudget,
  LocalRule,
} from "@/lib/db/schema";

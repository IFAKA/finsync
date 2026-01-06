"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useState } from "react";
import {
  getLocalDB,
  initializeLocalDB,
  localDB,
  type LocalCategory,
  type LocalTransaction,
  type LocalBudget,
  type LocalRule,
} from "@/lib/db/local-db";

// Initialize database on first use
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

function ensureDbInitialized(): Promise<void> {
  if (dbInitialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = initializeLocalDB().then(() => {
    dbInitialized = true;
  });

  return initPromise;
}

// Hook to ensure DB is initialized
export function useDbInit() {
  const [isReady, setIsReady] = useState(dbInitialized);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    ensureDbInitialized()
      .then(() => setIsReady(true))
      .catch(setError);
  }, []);

  return { isReady, error };
}

// Categories hooks
export function useCategories() {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const categories = useLiveQuery(
    () => (isReady ? db.categories.filter((c) => !c._deleted).toArray() : []),
    [isReady]
  );

  return {
    data: categories ?? [],
    isLoading: !isReady || categories === undefined,
  };
}

export function useCategoryMutations() {
  const create = useCallback(
    async (
      data: Omit<
        LocalCategory,
        "id" | "createdAt" | "_lastModified" | "_deleted"
      >
    ) => {
      await ensureDbInitialized();
      return localDB.createCategory(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalCategory>) => {
      return localDB.updateCategory(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    return localDB.deleteCategory(id);
  }, []);

  return { create, update, remove };
}

// Transactions hooks
export function useTransactions(options?: {
  categoryId?: string;
  month?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const transactions = useLiveQuery(async () => {
    if (!isReady) return [];

    let collection = db.transactions.filter((t) => !t._deleted);

    if (options?.categoryId) {
      collection = collection.filter(
        (t) => t.categoryId === options.categoryId
      );
    }

    if (options?.month) {
      const [year, month] = options.month.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      collection = collection.filter(
        (t) => t.date >= startDate && t.date <= endDate
      );
    }

    let result = await collection.sortBy("date");
    result.reverse();

    if (options?.offset) {
      result = result.slice(options.offset);
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }, [isReady, options?.categoryId, options?.month, options?.limit, options?.offset]);

  return {
    data: transactions ?? [],
    isLoading: !isReady || transactions === undefined,
  };
}

export function useTransactionCount(month?: string) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const count = useLiveQuery(async () => {
    if (!isReady) return 0;

    let collection = db.transactions.filter((t) => !t._deleted);

    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);
      collection = collection.filter(
        (t) => t.date >= startDate && t.date <= endDate
      );
    }

    return collection.count();
  }, [isReady, month]);

  return {
    data: count ?? 0,
    isLoading: !isReady || count === undefined,
  };
}

export function useAvailableMonths() {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const months = useLiveQuery(async () => {
    if (!isReady) return [];
    return localDB.getAvailableMonths();
  }, [isReady]);

  return {
    data: months ?? [],
    isLoading: !isReady || months === undefined,
  };
}

export function useTransactionMutations() {
  const create = useCallback(
    async (
      data: Omit<
        LocalTransaction,
        "id" | "createdAt" | "_lastModified" | "_deleted"
      >
    ) => {
      await ensureDbInitialized();
      return localDB.createTransaction(data);
    },
    []
  );

  const bulkCreate = useCallback(
    async (
      transactions: Omit<
        LocalTransaction,
        "id" | "createdAt" | "_lastModified" | "_deleted"
      >[]
    ) => {
      await ensureDbInitialized();
      return localDB.bulkCreateTransactions(transactions);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalTransaction>) => {
      return localDB.updateTransaction(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    return localDB.deleteTransaction(id);
  }, []);

  return { create, bulkCreate, update, remove };
}

// Budgets hooks
export function useBudgets(month?: string) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const budgets = useLiveQuery(async () => {
    if (!isReady) return [];

    let collection = db.budgets.filter((b) => !b._deleted);

    if (month) {
      collection = collection.filter((b) => b.month === month);
    }

    return collection.toArray();
  }, [isReady, month]);

  return {
    data: budgets ?? [],
    isLoading: !isReady || budgets === undefined,
  };
}

export function useBudgetMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalBudget, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return localDB.createBudget(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalBudget>) => {
      return localDB.updateBudget(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    return localDB.deleteBudget(id);
  }, []);

  return { create, update, remove };
}

// Rules hooks
export function useRules() {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const rules = useLiveQuery(async () => {
    if (!isReady) return [];
    return db.rules
      .filter((r) => !r._deleted)
      .sortBy("priority")
      .then((rules) => rules.reverse());
  }, [isReady]);

  return {
    data: rules ?? [],
    isLoading: !isReady || rules === undefined,
  };
}

export function useRuleMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalRule, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return localDB.createRule(data);
    },
    []
  );

  const update = useCallback(async (id: string, data: Partial<LocalRule>) => {
    return localDB.updateRule(id, data);
  }, []);

  const remove = useCallback(async (id: string) => {
    return localDB.deleteRule(id);
  }, []);

  return { create, update, remove };
}

// Monthly summary hook
export function useMonthlySummary(month: string) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const summary = useLiveQuery(async () => {
    if (!isReady || !month) return null;
    return localDB.getMonthlySummary(month);
  }, [isReady, month]);

  return {
    data: summary ?? { income: 0, expenses: 0, savings: 0, byCategory: [] },
    isLoading: !isReady || summary === undefined,
  };
}

// Export types for convenience
export type {
  LocalCategory,
  LocalTransaction,
  LocalBudget,
  LocalRule,
} from "@/lib/db/local-db";

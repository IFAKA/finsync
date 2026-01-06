"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalBudget } from "@/lib/db/schema";
import { createBudget, updateBudget, deleteBudget } from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

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
      return createBudget(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalBudget>) => {
      return updateBudget(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    return deleteBudget(id);
  }, []);

  return { create, update, remove };
}

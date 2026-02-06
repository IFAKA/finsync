"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalSavingsGoal } from "@/lib/db/schema";
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

export function useSavingsGoals() {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const goals = useLiveQuery(async () => {
    if (!isReady) return [];
    return db.savingsGoals.filter((g) => !g._deleted).toArray();
  }, [isReady]);

  return {
    data: goals ?? [],
    isLoading: !isReady || goals === undefined,
  };
}

export function useSavingsGoalById(id: string | undefined) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const goal = useLiveQuery(async () => {
    if (!isReady || !id) return null;
    const g = await db.savingsGoals.get(id);
    return g && !g._deleted ? g : null;
  }, [isReady, id]);

  return {
    data: goal ?? null,
    isLoading: !isReady || goal === undefined,
  };
}

export function useSavingsGoalMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalSavingsGoal, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return createSavingsGoal(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalSavingsGoal>) => {
      await ensureDbInitialized();
      return updateSavingsGoal(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await ensureDbInitialized();
    return deleteSavingsGoal(id);
  }, []);

  return { create, update, remove };
}

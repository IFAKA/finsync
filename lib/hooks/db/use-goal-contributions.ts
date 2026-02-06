"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalGoalContribution } from "@/lib/db/schema";
import {
  createGoalContribution,
  deleteGoalContribution,
} from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

export function useGoalContributions(goalId?: string) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const contributions = useLiveQuery(async () => {
    if (!isReady) return [];

    let collection = db.goalContributions.filter((c) => !c._deleted);

    if (goalId) {
      collection = collection.filter((c) => c.goalId === goalId);
    }

    const result = await collection.sortBy("date");
    result.reverse();
    return result;
  }, [isReady, goalId]);

  return {
    data: contributions ?? [],
    isLoading: !isReady || contributions === undefined,
  };
}

export function useGoalContributionMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalGoalContribution, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return createGoalContribution(data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await ensureDbInitialized();
    return deleteGoalContribution(id);
  }, []);

  return { create, remove };
}

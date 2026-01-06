"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalRule } from "@/lib/db/schema";
import { createRule, updateRule, deleteRule } from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

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
      return createRule(data);
    },
    []
  );

  const update = useCallback(async (id: string, data: Partial<LocalRule>) => {
    return updateRule(id, data);
  }, []);

  const remove = useCallback(async (id: string) => {
    return deleteRule(id);
  }, []);

  return { create, update, remove };
}

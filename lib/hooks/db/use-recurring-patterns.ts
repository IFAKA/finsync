"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalRecurringPattern } from "@/lib/db/schema";
import {
  createRecurringPattern,
  updateRecurringPattern,
  deleteRecurringPattern,
} from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

export function useRecurringPatterns(options?: {
  source?: 'detected' | 'manual';
  isActive?: boolean;
}) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const patterns = useLiveQuery(async () => {
    if (!isReady) return [];

    let collection = db.recurringPatterns.filter((p) => !p._deleted);

    if (options?.source !== undefined) {
      collection = collection.filter((p) => p.source === options.source);
    }

    if (options?.isActive !== undefined) {
      collection = collection.filter((p) => p.isActive === options.isActive);
    }

    return collection.toArray();
  }, [isReady, options?.source, options?.isActive]);

  return {
    data: patterns ?? [],
    isLoading: !isReady || patterns === undefined,
  };
}

export function useRecurringPatternMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalRecurringPattern, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return createRecurringPattern(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalRecurringPattern>) => {
      await ensureDbInitialized();
      return updateRecurringPattern(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await ensureDbInitialized();
    return deleteRecurringPattern(id);
  }, []);

  return { create, update, remove };
}

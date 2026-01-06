"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalCategory } from "@/lib/db/schema";
import { createCategory, updateCategory, deleteCategory } from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

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
      data: Omit<LocalCategory, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return createCategory(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalCategory>) => {
      return updateCategory(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    return deleteCategory(id);
  }, []);

  return { create, update, remove };
}

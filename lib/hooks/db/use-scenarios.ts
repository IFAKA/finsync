"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalScenario } from "@/lib/db/schema";
import {
  createScenario,
  updateScenario,
  deleteScenario,
} from "@/lib/db/operations";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

export function useScenarios() {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const scenarios = useLiveQuery(async () => {
    if (!isReady) return [];
    return db.scenarios.filter((s) => !s._deleted).toArray();
  }, [isReady]);

  return {
    data: scenarios ?? [],
    isLoading: !isReady || scenarios === undefined,
  };
}

export function useScenarioById(id: string | undefined) {
  const db = getLocalDB();
  const { isReady } = useDbInit();

  const scenario = useLiveQuery(async () => {
    if (!isReady || !id) return null;
    const s = await db.scenarios.get(id);
    return s && !s._deleted ? s : null;
  }, [isReady, id]);

  return {
    data: scenario ?? null,
    isLoading: !isReady || scenario === undefined,
  };
}

export function useScenarioMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalScenario, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return createScenario(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalScenario>) => {
      await ensureDbInitialized();
      return updateScenario(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await ensureDbInitialized();
    return deleteScenario(id);
  }, []);

  return { create, update, remove };
}

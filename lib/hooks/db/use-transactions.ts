"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getLocalDB, type LocalTransaction } from "@/lib/db/schema";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkCreateTransactions,
  bulkUpdateTransactions,
  revertBulkUpdate,
} from "@/lib/db/operations";
import { findSimilarTransactions, getAvailableMonths, getMonthlySummary } from "@/lib/db/business";
import { useDbInit, ensureDbInitialized } from "./use-db-init";

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
  const { isReady } = useDbInit();

  const months = useLiveQuery(async () => {
    if (!isReady) return [];
    return getAvailableMonths();
  }, [isReady]);

  return {
    data: months ?? [],
    isLoading: !isReady || months === undefined,
  };
}

export function useTransactionMutations() {
  const create = useCallback(
    async (
      data: Omit<LocalTransaction, "id" | "createdAt" | "_lastModified" | "_deleted">
    ) => {
      await ensureDbInitialized();
      return createTransaction(data);
    },
    []
  );

  const bulkCreate = useCallback(
    async (
      transactions: Omit<LocalTransaction, "id" | "createdAt" | "_lastModified" | "_deleted">[]
    ) => {
      await ensureDbInitialized();
      return bulkCreateTransactions(transactions);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<LocalTransaction>) => {
      return updateTransaction(id, data);
    },
    []
  );

  const bulkUpdate = useCallback(
    async (ids: string[], data: Partial<LocalTransaction>) => {
      return bulkUpdateTransactions(ids, data);
    },
    []
  );

  const revertBulk = useCallback(
    async (previousStates: { id: string; previousCategoryId?: string }[]) => {
      return revertBulkUpdate(previousStates);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    return deleteTransaction(id);
  }, []);

  return { create, bulkCreate, update, bulkUpdate, revertBulkUpdate: revertBulk, remove };
}

export function useFindSimilarTransactions() {
  const findSimilar = useCallback(
    async (
      criteria: {
        descriptionContains?: string;
        amountMin?: number;
        amountMax?: number;
        amountEquals?: number;
      },
      excludeId?: string
    ) => {
      await ensureDbInitialized();
      return findSimilarTransactions(criteria, excludeId);
    },
    []
  );

  return { findSimilar };
}

export function useMonthlySummary(month: string) {
  const { isReady } = useDbInit();

  const summary = useLiveQuery(async () => {
    if (!isReady || !month) return null;
    return getMonthlySummary(month);
  }, [isReady, month]);

  return {
    data: summary ?? { income: 0, expenses: 0, savings: 0, byCategory: [] },
    isLoading: !isReady || summary === undefined,
  };
}

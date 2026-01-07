"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  generateSpendingInsights,
  isModelLoaded,
  isModelLoading,
  type SpendingData,
  type LoadingCallback,
} from "@/lib/ai/web-llm";
import { formatMonth } from "@/lib/utils";

interface UseAIInsightsOptions {
  summary: {
    income: number;
    expenses: number;
    savings: number;
    byCategory: Array<{ categoryId: string; amount: number }>;
  };
  selectedMonth: string | null;
  categories: Array<{ id: string; name: string }>;
  budgetUsed?: number;
  budgetTotal?: number;
  // Optional previous month data for comparison
  previousMonthSummary?: {
    totalIncome: number;
    totalExpenses: number;
  };
}

interface AIInsightsState {
  insight: string | null;
  isLoading: boolean;
  isModelLoading: boolean;
  modelProgress: string;
  error: string | null;
}

// Cache insights by month to avoid re-generating
// Persisted to localStorage to survive page reloads
const CACHE_KEY = "ai-insights-cache";

function loadCache(): Map<string, string> {
  if (typeof window === "undefined") return new Map();
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      return new Map(JSON.parse(stored));
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
}

function saveCache(cache: Map<string, string>) {
  if (typeof window === "undefined") return;
  try {
    // Keep only last 12 entries to avoid bloating localStorage
    const entries = Array.from(cache.entries()).slice(-12);
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota errors
  }
}

const insightsCache = loadCache();

export function useAIInsights({
  summary,
  selectedMonth,
  categories,
  budgetUsed,
  budgetTotal,
  previousMonthSummary,
}: UseAIInsightsOptions) {
  const [state, setState] = useState<AIInsightsState>({
    insight: null,
    isLoading: false,
    isModelLoading: false,
    modelProgress: "",
    error: null,
  });

  // Track if generation is in progress to prevent duplicate calls
  const generatingRef = useRef(false);
  const lastMonthRef = useRef<string | null>(null);
  // Track if component is mounted to avoid setting state after unmount
  const mountedRef = useRef(true);

  // Build cache key - only regenerate if month or totals change
  const cacheKey = selectedMonth && selectedMonth !== "all"
    ? `${selectedMonth}-${Math.round(summary.expenses)}-${Math.round(summary.income)}`
    : null;

  const generateInsight = useCallback(async (forceRegenerate = false) => {
    if (!selectedMonth || selectedMonth === "all" || !cacheKey) {
      setState((prev) => ({ ...prev, insight: null, error: null }));
      return;
    }

    // Check cache first (unless forcing regeneration)
    if (!forceRegenerate) {
      const cached = insightsCache.get(cacheKey);
      if (cached) {
        setState((prev) => ({
          ...prev,
          insight: cached,
          isLoading: false,
          error: null,
        }));
        return;
      }
    }

    // Prevent duplicate generation
    if (generatingRef.current) return;
    generatingRef.current = true;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Store the cacheKey we're generating for to check later
    const generatingForKey = cacheKey;

    try {
      // Build spending data
      const categoryData = summary.byCategory.map((c) => {
        const cat = categories.find((cat) => cat.id === c.categoryId);
        return {
          categoryName: cat?.name || "Other",
          amount: c.amount,
          percentOfTotal:
            summary.expenses > 0 ? (c.amount / summary.expenses) * 100 : 0,
        };
      });

      const spendingData: SpendingData = {
        totalExpenses: summary.expenses,
        totalIncome: summary.income,
        savings: summary.savings,
        byCategory: categoryData,
        budgetUsed,
        budgetTotal,
        previousMonth: previousMonthSummary,
      };

      const monthLabel = formatMonth(selectedMonth, { month: "long", year: "numeric" });

      const onProgress: LoadingCallback = (progress) => {
        // Don't update state if unmounted
        if (!mountedRef.current) return;

        if (progress.stage === "downloading" || progress.stage === "loading") {
          setState((prev) => ({
            ...prev,
            isModelLoading: true,
            modelProgress: progress.text,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isModelLoading: false,
            modelProgress: "",
          }));
        }
      };

      const insight = await generateSpendingInsights(
        spendingData,
        monthLabel,
        onProgress
      );

      // Cache the result (always cache even if unmounted - it's still valid)
      if (generatingForKey) {
        insightsCache.set(generatingForKey, insight);
        saveCache(insightsCache);
      }

      // Only update state if still mounted
      if (mountedRef.current) {
        setState({
          insight,
          isLoading: false,
          isModelLoading: false,
          modelProgress: "",
          error: null,
        });
      }
    } catch (error) {
      console.error("[AIInsights] Failed to generate:", error);
      // Only update state if still mounted
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isModelLoading: false,
          error: "Failed to generate insight",
        }));
      }
    } finally {
      generatingRef.current = false;
    }
  }, [
    selectedMonth,
    cacheKey,
    summary,
    categories,
    budgetUsed,
    budgetTotal,
    previousMonthSummary,
  ]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check cache on mount and when cacheKey changes
  useEffect(() => {
    if (!cacheKey) {
      setState((prev) => ({ ...prev, insight: null }));
      return;
    }

    // Check if we have a cached insight for this exact state
    const cached = insightsCache.get(cacheKey);
    if (cached) {
      setState((prev) => ({
        ...prev,
        insight: cached,
        isLoading: false,
        error: null,
      }));
      lastMonthRef.current = cacheKey;
      return;
    }

    // Only generate if we have expenses and this is a new month/data combination
    if (summary.expenses > 0 && lastMonthRef.current !== cacheKey) {
      lastMonthRef.current = cacheKey;
      generateInsight();
    }
  }, [cacheKey, summary.expenses, generateInsight]);

  const regenerate = useCallback(() => {
    if (cacheKey) {
      // Clear cache for this month
      insightsCache.delete(cacheKey);
      generateInsight(true);
    }
  }, [cacheKey, generateInsight]);

  return {
    ...state,
    regenerate,
    isReady: isModelLoaded(),
    isInitializing: isModelLoading(),
  };
}

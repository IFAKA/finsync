"use client";

import { useState, useEffect, useCallback } from "react";
import type { LocalTransaction } from "@/lib/hooks/db";
import { useFindSimilarTransactions } from "@/lib/hooks/db";

export interface RuleCriteria {
  name: string;
  categoryId: string;
  descriptionContains: string;
  amountEquals: string;
  amountMin: string;
  amountMax: string;
  useAmountFilter: boolean;
}

const initialCriteria: RuleCriteria = {
  name: "",
  categoryId: "",
  descriptionContains: "",
  amountEquals: "",
  amountMin: "",
  amountMax: "",
  useAmountFilter: false,
};

interface UseRuleFormOptions {
  open: boolean;
  prefillTransaction?: LocalTransaction;
  prefillCategoryId?: string;
}

export function useRuleForm({ open, prefillTransaction, prefillCategoryId }: UseRuleFormOptions) {
  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<RuleCriteria>(initialCriteria);
  const [matchingTransactions, setMatchingTransactions] = useState<LocalTransaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { findSimilar } = useFindSimilarTransactions();

  // Initialize form when prefill changes
  useEffect(() => {
    if (open && prefillTransaction) {
      const desc = prefillTransaction.rawDescription || prefillTransaction.description;
      const amount = prefillTransaction.amount;
      const tolerance = Math.abs(amount * 0.05); // 5% tolerance

      setCriteria({
        name: `${desc.slice(0, 30)}${desc.length > 30 ? "..." : ""}`,
        categoryId: prefillCategoryId || "",
        descriptionContains: desc,
        amountEquals: "",
        amountMin: (amount - tolerance).toFixed(2),
        amountMax: (amount + tolerance).toFixed(2),
        useAmountFilter: false,
      });
      setStep(0);
    } else if (open && !prefillTransaction) {
      // Reset for standalone mode
      setCriteria(initialCriteria);
      setStep(0);
    }
  }, [open, prefillTransaction, prefillCategoryId]);

  // Search for matching transactions when criteria changes
  const searchMatches = useCallback(async () => {
    setIsSearching(true);
    try {
      const searchCriteria: {
        descriptionContains?: string;
        amountMin?: number;
        amountMax?: number;
        amountEquals?: number;
      } = {};

      if (criteria.descriptionContains) {
        searchCriteria.descriptionContains = criteria.descriptionContains;
      }

      if (criteria.useAmountFilter) {
        if (criteria.amountEquals) {
          searchCriteria.amountEquals = parseFloat(criteria.amountEquals);
        } else {
          if (criteria.amountMin) {
            searchCriteria.amountMin = parseFloat(criteria.amountMin);
          }
          if (criteria.amountMax) {
            searchCriteria.amountMax = parseFloat(criteria.amountMax);
          }
        }
      }

      const matches = await findSimilar(searchCriteria, prefillTransaction?.id);
      setMatchingTransactions(matches);
    } catch (error) {
      console.error("Error searching matches:", error);
      setMatchingTransactions([]);
    }
    setIsSearching(false);
  }, [criteria, findSimilar, prefillTransaction?.id]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(searchMatches, 300);
    return () => clearTimeout(timeout);
  }, [open, searchMatches]);

  const updateCriteria = useCallback((updates: Partial<RuleCriteria>) => {
    setCriteria((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed =
    criteria.name &&
    criteria.categoryId &&
    (criteria.descriptionContains ||
      (criteria.useAmountFilter &&
        (criteria.amountEquals || criteria.amountMin || criteria.amountMax)));

  const totalCount = matchingTransactions.length + (prefillTransaction ? 1 : 0);

  const buildRuleCriteria = useCallback(() => {
    const ruleCriteria: {
      name: string;
      categoryId: string;
      descriptionContains?: string;
      amountEquals?: number;
      amountMin?: number;
      amountMax?: number;
    } = {
      name: criteria.name,
      categoryId: criteria.categoryId,
    };

    if (criteria.descriptionContains) {
      ruleCriteria.descriptionContains = criteria.descriptionContains;
    }

    if (criteria.useAmountFilter) {
      if (criteria.amountEquals) {
        ruleCriteria.amountEquals = parseFloat(criteria.amountEquals);
      } else {
        if (criteria.amountMin) {
          ruleCriteria.amountMin = parseFloat(criteria.amountMin);
        }
        if (criteria.amountMax) {
          ruleCriteria.amountMax = parseFloat(criteria.amountMax);
        }
      }
    }

    return ruleCriteria;
  }, [criteria]);

  return {
    step,
    setStep,
    criteria,
    updateCriteria,
    matchingTransactions,
    isSearching,
    canProceed,
    totalCount,
    buildRuleCriteria,
  };
}

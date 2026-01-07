"use client";

import { useState, useEffect, useCallback } from "react";
import type { LocalTransaction } from "@/lib/hooks/db";
import { useFindSimilarTransactions } from "@/lib/hooks/db";

export interface RuleCriteria {
  name: string;
  categoryId: string;
  displayName: string;
  descriptionContains: string;
  amountEquals: string;
  amountMin: string;
  amountMax: string;
}

const initialCriteria: RuleCriteria = {
  name: "",
  categoryId: "",
  displayName: "",
  descriptionContains: "",
  amountEquals: "",
  amountMin: "",
  amountMax: "",
};

interface UseRuleFormOptions {
  open: boolean;
  prefillTransaction?: LocalTransaction;
  prefillCategoryId?: string;
  initialRule?: {
    name: string;
    categoryId?: string;
    displayName?: string;
    descriptionContains?: string;
    amountEquals?: number;
    amountMin?: number;
    amountMax?: number;
  };
}

export function useRuleForm({ open, prefillTransaction, prefillCategoryId, initialRule }: UseRuleFormOptions) {
  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<RuleCriteria>(initialCriteria);
  const [matchingTransactions, setMatchingTransactions] = useState<LocalTransaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { findSimilar } = useFindSimilarTransactions();

  // Initialize form when prefill changes
  useEffect(() => {
    if (open && initialRule) {
      // Editing an existing rule
      setCriteria({
        name: initialRule.name,
        categoryId: initialRule.categoryId || "",
        displayName: initialRule.displayName || "",
        descriptionContains: initialRule.descriptionContains || "",
        amountEquals: initialRule.amountEquals?.toString() || "",
        amountMin: initialRule.amountMin?.toString() || "",
        amountMax: initialRule.amountMax?.toString() || "",
      });
      setStep(0);
    } else if (open && prefillTransaction) {
      const desc = prefillTransaction.rawDescription || prefillTransaction.description;

      setCriteria({
        name: `${desc.slice(0, 30)}${desc.length > 30 ? "..." : ""}`,
        categoryId: prefillCategoryId || "",
        displayName: "",
        descriptionContains: desc,
        amountEquals: "",
        amountMin: "",
        amountMax: "",
      });
      setStep(0);
    } else if (open && !prefillTransaction && !initialRule) {
      // Reset for standalone mode
      setCriteria(initialCriteria);
      setStep(0);
    }
  }, [open, prefillTransaction, prefillCategoryId, initialRule]);

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
      if (criteria.amountEquals) {
        searchCriteria.amountEquals = parseFloat(criteria.amountEquals);
      }
      if (criteria.amountMin) {
        searchCriteria.amountMin = parseFloat(criteria.amountMin);
      }
      if (criteria.amountMax) {
        searchCriteria.amountMax = parseFloat(criteria.amountMax);
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

  const hasConditions = !!(
    criteria.descriptionContains || criteria.amountEquals || criteria.amountMin || criteria.amountMax
  );

  const canProceed =
    criteria.name &&
    (criteria.categoryId || criteria.displayName) &&
    hasConditions;

  const totalCount = matchingTransactions.length + (prefillTransaction ? 1 : 0);

  const buildRuleCriteria = useCallback(() => {
    const ruleCriteria: {
      name: string;
      categoryId?: string;
      displayName?: string;
      descriptionContains?: string;
      amountEquals?: number;
      amountMin?: number;
      amountMax?: number;
    } = {
      name: criteria.name,
    };

    if (criteria.categoryId) {
      ruleCriteria.categoryId = criteria.categoryId;
    }
    if (criteria.displayName) {
      ruleCriteria.displayName = criteria.displayName;
    }
    if (criteria.descriptionContains) {
      ruleCriteria.descriptionContains = criteria.descriptionContains;
    }
    if (criteria.amountEquals) {
      ruleCriteria.amountEquals = parseFloat(criteria.amountEquals);
    }
    if (criteria.amountMin) {
      ruleCriteria.amountMin = parseFloat(criteria.amountMin);
    }
    if (criteria.amountMax) {
      ruleCriteria.amountMax = parseFloat(criteria.amountMax);
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
    hasConditions,
    totalCount,
    buildRuleCriteria,
  };
}

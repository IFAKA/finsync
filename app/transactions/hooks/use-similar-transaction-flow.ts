"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import {
  useTransactionMutations,
  useRuleMutations,
  useFindSimilarTransactions,
  type LocalTransaction,
} from "@/lib/hooks/db";

interface RecentlyCategorized {
  transaction: LocalTransaction;
  categoryId: string;
  similarCount: number;
}

export function useSimilarTransactionFlow() {
  const [recentlyCategorized, setRecentlyCategorized] = useState<RecentlyCategorized | null>(null);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const pillTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { update: updateTransaction, bulkUpdate, revertBulkUpdate } = useTransactionMutations();
  const { create: createRule, update: updateRule, remove: deleteRule } = useRuleMutations();
  const { findSimilar } = useFindSimilarTransactions();

  const handleCategoryChange = useCallback(
    async (transaction: LocalTransaction, newCategoryId: string) => {
      try {
        await updateTransaction(transaction.id, { categoryId: newCategoryId });
        playSound("complete");

        // Clear any existing pill timeout
        if (pillTimeoutRef.current) {
          clearTimeout(pillTimeoutRef.current);
        }

        // Find similar transactions
        const desc = transaction.rawDescription || transaction.description;
        const similar = await findSimilar({ descriptionContains: desc }, transaction.id);

        if (similar.length > 0) {
          // Show the pill
          setRecentlyCategorized({
            transaction: { ...transaction, categoryId: newCategoryId },
            categoryId: newCategoryId,
            similarCount: similar.length,
          });

          // Auto-hide after 8 seconds
          pillTimeoutRef.current = setTimeout(() => {
            setRecentlyCategorized(null);
          }, 8000);
        } else {
          toast.success("Category updated");
        }
      } catch {
        toast.error("Failed to update category");
        playSound("error");
      }
    },
    [updateTransaction, findSimilar]
  );

  const handleCreateRuleSave = useCallback(
    async (
      criteria: {
        name: string;
        categoryId: string;
        descriptionContains?: string;
        amountEquals?: number;
        amountMin?: number;
        amountMax?: number;
      },
      matchingTransactionIds: string[]
    ) => {
      try {
        // Include the original transaction in the bulk update
        const allIds = recentlyCategorized
          ? [recentlyCategorized.transaction.id, ...matchingTransactionIds]
          : matchingTransactionIds;

        // Bulk update transactions
        const previousStates = await bulkUpdate(allIds, { categoryId: criteria.categoryId });

        // Create the rule
        const rule = await createRule({
          name: criteria.name,
          categoryId: criteria.categoryId,
          descriptionContains: criteria.descriptionContains,
          amountEquals: criteria.amountEquals,
          amountMin: criteria.amountMin,
          amountMax: criteria.amountMax,
          priority: 0,
          isEnabled: true,
        });

        setShowCreateRuleModal(false);
        setRecentlyCategorized(null);
        playSound("complete");

        // Show undo toast
        toast.success(`Rule saved · ${allIds.length} updated`, {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                // Revert transactions
                await revertBulkUpdate(previousStates);
                // Delete the rule
                await deleteRule(rule.id);
                toast.success("Changes reverted");
                playSound("toggle");
              } catch {
                toast.error("Failed to undo");
                playSound("error");
              }
            },
          },
          duration: 10000,
        });
      } catch {
        toast.error("Failed to save rule");
        playSound("error");
      }
    },
    [recentlyCategorized, bulkUpdate, createRule, revertBulkUpdate, deleteRule]
  );

  const handlePillClick = useCallback(() => {
    if (pillTimeoutRef.current) {
      clearTimeout(pillTimeoutRef.current);
    }
    setShowCreateRuleModal(true);
  }, []);

  const handlePillDismiss = useCallback(() => {
    if (pillTimeoutRef.current) {
      clearTimeout(pillTimeoutRef.current);
    }
    setRecentlyCategorized(null);
    toast.success("Category updated");
  }, []);

  const handleModalClose = useCallback((open: boolean) => {
    setShowCreateRuleModal(open);
    if (!open) {
      // If modal closed without saving, dismiss the pill too
      setRecentlyCategorized(null);
    }
  }, []);

  const handleCreateAlias = useCallback(
    async (
      criteria: {
        name: string;
        displayName: string;
        descriptionContains: string;
        categoryId?: string;
      },
      matchingTransactionIds: string[]
    ) => {
      try {
        // If category is specified, also update transactions
        let previousStates: { id: string; previousCategoryId?: string }[] = [];
        if (criteria.categoryId) {
          previousStates = await bulkUpdate(matchingTransactionIds, {
            categoryId: criteria.categoryId,
          });
        }

        // Create the alias rule
        const rule = await createRule({
          name: criteria.name,
          displayName: criteria.displayName,
          descriptionContains: criteria.descriptionContains,
          categoryId: criteria.categoryId,
          priority: 0,
          isEnabled: true,
        });

        playSound("complete");

        // Show undo toast
        const message = criteria.categoryId
          ? `Alias saved · ${matchingTransactionIds.length} renamed & categorized`
          : `Alias saved · ${matchingTransactionIds.length} renamed`;

        toast.success(message, {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                // Revert transactions if category was changed
                if (criteria.categoryId && previousStates.length > 0) {
                  await revertBulkUpdate(previousStates);
                }
                // Delete the rule
                await deleteRule(rule.id);
                toast.success("Alias removed");
                playSound("toggle");
              } catch {
                toast.error("Failed to undo");
                playSound("error");
              }
            },
          },
          duration: 10000,
        });
      } catch {
        toast.error("Failed to save alias");
        playSound("error");
      }
    },
    [bulkUpdate, createRule, revertBulkUpdate, deleteRule]
  );

  const handleUpdateAlias = useCallback(
    async (
      ruleId: string,
      criteria: {
        displayName: string;
        descriptionContains: string;
        categoryId?: string;
      },
      matchingTransactionIds: string[]
    ) => {
      try {
        // If category is specified, also update transactions
        if (criteria.categoryId) {
          await bulkUpdate(matchingTransactionIds, {
            categoryId: criteria.categoryId,
          });
        }

        // Update the alias rule
        await updateRule(ruleId, {
          displayName: criteria.displayName,
          descriptionContains: criteria.descriptionContains,
          categoryId: criteria.categoryId,
        });

        playSound("complete");
        toast.success("Alias updated");
      } catch {
        toast.error("Failed to update alias");
        playSound("error");
      }
    },
    [bulkUpdate, updateRule]
  );

  return {
    recentlyCategorized,
    showCreateRuleModal,
    handleCategoryChange,
    handleCreateRuleSave,
    handleCreateAlias,
    handleUpdateAlias,
    handlePillClick,
    handlePillDismiss,
    handleModalClose,
  };
}

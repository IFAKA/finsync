"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTransactionMutations, useCategories, useRules } from "@/lib/hooks/db";
import { generateId, localDB } from "@/lib/db";
import { playSound } from "@/lib/sounds";
import {
  categorizeTransactionsWithWebLLM,
  isModelLoaded,
  isModelLoading,
  initWebLLM,
  applyRules,
  applyBuiltinPatterns,
  type CategoryExample,
  type Rule,
} from "@/lib/ai/web-llm";

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  notes?: string;
  movementType?: string;
}

interface UseTransactionImportOptions {
  filename: string;
  bankName: string | null;
  transactions: ParsedTransaction[];
  onImportComplete: () => void;
}

export function useTransactionImport({
  filename,
  bankName,
  transactions,
  onImportComplete,
}: UseTransactionImportOptions) {
  const [isImporting, setIsImporting] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isPreloadingModel, setIsPreloadingModel] = useState(false);
  const [modelReady, setModelReady] = useState(isModelLoaded());
  const [status, setStatus] = useState<string>("");
  const [aiProgress, setAiProgress] = useState<string>("");
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(true);

  const { bulkCreate } = useTransactionMutations();
  const { data: categories } = useCategories();
  const { data: rules } = useRules();

  // Ref-based guard to prevent multiple simultaneous imports
  const importingRef = useRef(false);

  // Check for duplicates when component mounts
  useEffect(() => {
    const checkDuplicates = async () => {
      setIsCheckingDuplicates(true);
      try {
        const duplicates = await localDB.findDuplicates(
          transactions.map((t) => ({
            date: new Date(t.date),
            amount: t.amount,
            description: t.description,
          }))
        );
        console.log(`[Import] Duplicate check: ${duplicates.size} duplicates found out of ${transactions.length} transactions`);
        setDuplicateIndices(duplicates);
      } catch (error) {
        console.error("Failed to check duplicates:", error);
      }
      setIsCheckingDuplicates(false);
    };
    checkDuplicates();
  }, [transactions]);

  // Preload AI model when component mounts (if categories exist)
  useEffect(() => {
    if (categories.length > 0 && !isModelLoaded() && !isModelLoading()) {
      setIsPreloadingModel(true);
      setAiProgress("Loading AI model for categorization...");
      initWebLLM((progress) => {
        setAiProgress(progress.text);
        if (progress.stage === "ready") {
          setModelReady(true);
          setIsPreloadingModel(false);
          setAiProgress("");
        }
      }).catch(() => {
        setIsPreloadingModel(false);
        setAiProgress("");
      });
    }
  }, [categories.length]);

  const uniqueTransactions = transactions.filter((_, i) => !duplicateIndices.has(i));
  const duplicateCount = duplicateIndices.size;

  const handleImport = useCallback(async () => {
    // Synchronous guard to prevent multiple imports
    if (importingRef.current) {
      console.log("[Import] Already importing, ignoring duplicate call");
      return;
    }
    importingRef.current = true;

    if (uniqueTransactions.length === 0) {
      toast.error("No new transactions to import - all are duplicates");
      importingRef.current = false;
      return;
    }

    setIsImporting(true);
    const batchId = generateId();
    console.log(`[Import] Starting import of ${uniqueTransactions.length} transactions (batch: ${batchId})`);
    console.log(`[Import] First 3 tx: ${uniqueTransactions.slice(0, 3).map(t => `${t.date}|${t.amount}|${t.description.substring(0,20)}`).join(' | ')}`);

    try {
      // Prepare transactions in memory
      const transactionsToSave = uniqueTransactions.map((t) => {
        const rawDescription = t.notes
          ? `${t.description} | ${t.notes}`
          : t.description;

        return {
          date: new Date(t.date),
          description: t.description,
          rawDescription,
          amount: t.amount,
          balance: t.balance,
          isRecurring: false,
          needsReview: false,
          importBatchId: batchId,
          sourceFile: filename,
          bankName: bankName || undefined,
          categoryId: undefined as string | undefined,
          categoryConfidence: undefined as number | undefined,
          merchant: undefined as string | undefined,
        };
      });

      // Step 1: Categorize
      if (categories.length > 0) {
        setIsCategorizing(true);
        const categoryNames = categories.map((c) => c.name);
        const categoryMap = new Map(categories.map((c) => [c.name, c.id]));
        const categoryIdToName = new Map(categories.map((c) => [c.id, c.name]));

        // Track which transactions still need categorization
        const matchedIndices = new Set<number>();

        // Step 1a: Apply BUILT-IN patterns first (highest priority, 100% accurate)
        setStatus("Applying built-in patterns…");
        const { matches: builtinMatches } = applyBuiltinPatterns(
          transactionsToSave.map((t) => ({
            description: t.rawDescription,
            amount: t.amount,
          })),
          categoryMap
        );

        for (const match of builtinMatches) {
          const tx = transactionsToSave[match.index - 1];
          if (tx) {
            tx.categoryId = match.categoryId;
            tx.categoryConfidence = 1.0;
            matchedIndices.add(match.index - 1);
          }
        }

        // Step 1b: Apply user rules for remaining unmatched
        if (rules.length > 0) {
          const unmatchedForRules = transactionsToSave
            .map((t, i) => ({ ...t, originalIndex: i }))
            .filter((_, i) => !matchedIndices.has(i));

          if (unmatchedForRules.length > 0) {
            setStatus("Applying user rules…");
            // Only include rules with categoryId (filter out display-name-only rules)
            const rulesForMatching: Rule[] = rules
              .filter((r) => r.categoryId)
              .map((r) => ({
                id: r.id,
                categoryId: r.categoryId!,
                descriptionContains: r.descriptionContains,
                amountEquals: r.amountEquals,
                amountMin: r.amountMin,
                amountMax: r.amountMax,
                isEnabled: r.isEnabled,
                priority: r.priority,
              }));

            const { matches: ruleMatches } = applyRules(
              unmatchedForRules.map((t) => ({
                description: t.rawDescription,
                amount: t.amount,
              })),
              rulesForMatching
            );

            for (const match of ruleMatches) {
              const originalIndex = unmatchedForRules[match.index - 1]?.originalIndex;
              if (originalIndex !== undefined) {
                const tx = transactionsToSave[originalIndex];
                if (tx) {
                  tx.categoryId = match.categoryId;
                  tx.categoryConfidence = 1.0;
                  matchedIndices.add(originalIndex);
                }
              }
            }
          }
        }

        // Step 1c: Use AI for remaining unmatched transactions
        const finalUnmatchedIndices = transactionsToSave
          .map((_, i) => i)
          .filter((i) => !matchedIndices.has(i));

        if (finalUnmatchedIndices.length > 0) {
          if (!modelReady) {
            setStatus("Loading AI model…");
            await initWebLLM((progress) => {
              setAiProgress(progress.text);
            });
          }

          setStatus(`Categorizing ${finalUnmatchedIndices.length} with AI…`);

          try {
            const categoryExamples = await getCategoryExamples(categoryIdToName);
            const unmatchedTxs = finalUnmatchedIndices.map((i) => ({
              description: transactionsToSave[i].rawDescription,
              amount: transactionsToSave[i].amount,
              date: transactionsToSave[i].date.toISOString().split("T")[0],
              originalIndex: i,
            }));

            const results = await categorizeTransactionsWithWebLLM(
              unmatchedTxs.map((t) => ({
                description: t.description,
                amount: t.amount,
                date: t.date,
              })),
              categoryNames,
              (progress) => setAiProgress(progress.text),
              categoryExamples
            );

            for (const result of results) {
              const originalIndex = unmatchedTxs[result.index - 1]?.originalIndex;
              if (originalIndex !== undefined) {
                const tx = transactionsToSave[originalIndex];
                if (tx) {
                  const categoryId = categoryMap.get(result.category);
                  // Always save merchant (useful regardless of category confidence)
                  tx.merchant = result.merchant;
                  tx.categoryConfidence = result.confidence;
                  // Only assign category if confidence is high enough
                  if (categoryId && result.confidence >= 0.7) {
                    tx.categoryId = categoryId;
                  }
                }
              }
            }
          } catch (error) {
            console.error("AI categorization failed:", error);
            toast.warning("AI categorization failed, using patterns only");
          }
        }

        setIsCategorizing(false);
      }

      // Step 2: Save everything at once
      setStatus("Saving transactions…");
      const created = await bulkCreate(transactionsToSave);

      const categorizedCount = created.filter((t) => t.categoryId).length;

      if (categorizedCount > 0) {
        setStatus(`Done! Imported ${created.length}, categorized ${categorizedCount}`);
        toast.success(`Imported ${created.length} and categorized ${categorizedCount}`);
      } else {
        setStatus(`Imported ${created.length} transactions`);
        toast.success(`Imported ${created.length} transactions`);
      }
      playSound("success");

      await new Promise((resolve) => setTimeout(resolve, 500));
      onImportComplete();
    } catch {
      setStatus("Import failed");
      toast.error("Import failed");
      playSound("error");
      setIsImporting(false);
      setIsCategorizing(false);
    } finally {
      importingRef.current = false;
    }
  }, [uniqueTransactions, filename, bankName, categories, rules, modelReady, bulkCreate, onImportComplete]);

  return {
    isImporting,
    isCategorizing,
    isPreloadingModel,
    isCheckingDuplicates,
    status,
    aiProgress,
    uniqueTransactions,
    duplicateCount,
    handleImport,
  };
}

async function getCategoryExamples(
  categoryIdToName: Map<string, string>
): Promise<CategoryExample[]> {
  const existingTxs = await localDB.getTransactions();
  const categorizedTxs = existingTxs.filter(
    (t) => t.categoryId && t.categoryConfidence && t.categoryConfidence >= 0.8
  );

  const examplesByCategory = new Map<string, string[]>();
  for (const tx of categorizedTxs.slice(-200)) {
    const catName = categoryIdToName.get(tx.categoryId!);
    if (catName) {
      const examples = examplesByCategory.get(catName) || [];
      if (examples.length < 5) {
        examples.push(tx.description);
        examplesByCategory.set(catName, examples);
      }
    }
  }

  return Array.from(examplesByCategory.entries()).map(([category, examples]) => ({
    category,
    examples,
  }));
}

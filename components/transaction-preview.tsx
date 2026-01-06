"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useTransactionMutations, useCategories } from "@/lib/hooks/use-local-db";
import { generateId, localDB } from "@/lib/db/local-db";
import { playSound } from "@/lib/sounds";
import { categorizeTransactionsWithWebLLM, isModelLoaded, isModelLoading, initWebLLM } from "@/lib/ai/web-llm";

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  notes?: string;
  movementType?: string;
}

interface TransactionPreviewProps {
  filename: string;
  bankName: string | null;
  transactions: ParsedTransaction[];
  onBack: () => void;
  onImportComplete: () => void;
}

export function TransactionPreview({
  filename,
  bankName,
  transactions,
  onBack,
  onImportComplete,
}: TransactionPreviewProps) {
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

  // Filter out duplicates
  const uniqueTransactions = transactions.filter((_, i) => !duplicateIndices.has(i));

  const handleImport = async () => {
    if (uniqueTransactions.length === 0) {
      toast.error("No new transactions to import - all are duplicates");
      return;
    }

    setIsImporting(true);
    const batchId = generateId();

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
          needsReview: true,
          importBatchId: batchId,
          sourceFile: filename,
          bankName: bankName || undefined,
          // Will be filled by categorization
          categoryId: undefined as string | undefined,
          categoryConfidence: undefined as number | undefined,
          merchant: undefined as string | undefined,
        };
      });

      // Step 1: Categorize first (if categories exist)
      if (categories.length > 0) {
        // Wait for model to be ready if it's still loading
        if (!modelReady) {
          setStatus("Waiting for AI model…");
          await initWebLLM((progress) => {
            setAiProgress(progress.text);
          });
        }

        setIsCategorizing(true);
        setStatus("Categorizing with AI…");

        try {
          const categoryNames = categories.map((c) => c.name);
          const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

          const results = await categorizeTransactionsWithWebLLM(
            transactionsToSave.map((t) => ({
              description: t.rawDescription,
              amount: t.amount,
              date: t.date.toISOString().split("T")[0],
            })),
            categoryNames,
            (progress) => {
              setAiProgress(progress.text);
            }
          );

          // Apply categories to transactions in memory
          for (const result of results) {
            const tx = transactionsToSave[result.index - 1];
            if (tx) {
              const categoryId = categoryMap.get(result.category);
              if (categoryId) {
                tx.categoryId = categoryId;
                tx.categoryConfidence = result.confidence;
                tx.merchant = result.merchant;
                tx.needsReview = result.confidence < 0.6;
              }
            }
          }
        } catch (error) {
          // Categorization failed - abort import
          console.error("Categorization failed:", error);
          setStatus("Categorization failed");
          setAiProgress("");
          setIsCategorizing(false);
          setIsImporting(false);
          toast.error("Categorization failed - import aborted");
          playSound("error");
          return;
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

      // Wait a bit before completing to show final status
      await new Promise((resolve) => setTimeout(resolve, 500));
      onImportComplete();
    } catch (error) {
      setStatus("Import failed");
      toast.error("Import failed");
      playSound("error");
      setIsImporting(false);
      setIsCategorizing(false);
    }
  };

  const dates = uniqueTransactions.length > 0
    ? uniqueTransactions.map((t) => new Date(t.date))
    : transactions.map((t) => new Date(t.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const duplicateCount = duplicateIndices.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <Button
          onClick={handleImport}
          disabled={isImporting || isCategorizing || isCheckingDuplicates || uniqueTransactions.length === 0}
        >
          {isImporting || isCategorizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isCategorizing ? "Categorizing…" : "Importing…"}
            </>
          ) : isCheckingDuplicates ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking…
            </>
          ) : uniqueTransactions.length === 0 ? (
            "All duplicates"
          ) : (
            `Import ${uniqueTransactions.length}`
          )}
        </Button>
      </div>

      <div>
        <h2 className="font-medium">{filename}</h2>
        <p className="text-sm text-muted-foreground">
          {transactions.length} transactions · {formatShortDate(minDate)} –{" "}
          {formatShortDate(maxDate)}
          {bankName && ` · ${bankName}`}
        </p>
        {duplicateCount > 0 && !isCheckingDuplicates && (
          <p className="text-sm text-warning mt-1">
            {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""} found (will be skipped)
          </p>
        )}
        {status && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            {(isImporting || isCategorizing) && <Sparkles className="w-4 h-4 animate-pulse" />}
            {status}
          </p>
        )}
        {aiProgress && (isCategorizing || isPreloadingModel) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {isPreloadingModel && <Download className="w-3 h-3 animate-bounce" />}
            {aiProgress}
          </p>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground p-3">
                Date
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">
                Description
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground p-3">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {uniqueTransactions.slice(0, 10).map((t, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 transition-colors hover:bg-muted/5"
              >
                <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                  {formatShortDate(new Date(t.date))}
                </td>
                <td className="p-3 text-sm truncate max-w-[200px]">
                  {t.description}
                </td>
                <td
                  className={`p-3 text-sm text-right tabular-nums whitespace-nowrap ${
                    t.amount >= 0 ? "text-success" : ""
                  }`}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {uniqueTransactions.length > 10 && (
        <p className="text-sm text-muted-foreground text-center">
          + {uniqueTransactions.length - 10} more transactions
        </p>
      )}
    </div>
  );
}

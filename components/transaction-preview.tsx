"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useTransactionMutations, useCategories } from "@/lib/hooks/use-local-db";
import { generateId } from "@/lib/db/local-db";
import { playSound } from "@/lib/sounds";
import { categorizeTransactionsWithWebLLM, isModelLoaded } from "@/lib/ai/web-llm";

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
  const [status, setStatus] = useState<string>("");
  const [aiProgress, setAiProgress] = useState<string>("");

  const { bulkCreate } = useTransactionMutations();
  const { data: categories } = useCategories();

  const handleImport = async () => {
    setIsImporting(true);
    setStatus("Importing transactions…");

    try {
      const batchId = generateId();

      // Create transactions in local DB
      const created = await bulkCreate(
        transactions.map((t) => {
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
          };
        })
      );

      setStatus(`Imported ${created.length} transactions`);

      // Try to categorize with WebLLM if model is loaded
      if (categories.length > 0) {
        setIsImporting(false);
        setIsCategorizing(true);
        setStatus("Categorizing with AI…");

        try {
          const categoryNames = categories.map((c) => c.name);
          const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

          const results = await categorizeTransactionsWithWebLLM(
            created.map((t) => ({
              description: t.rawDescription,
              amount: t.amount,
              date: t.date.toISOString().split("T")[0],
            })),
            categoryNames,
            (progress) => {
              setAiProgress(progress.text);
            }
          );

          // Update transactions with categories
          const { update } = await import("@/lib/db/local-db").then((m) => ({
            update: m.localDB.updateTransaction,
          }));

          let categorized = 0;
          for (const result of results) {
            const tx = created[result.index - 1];
            if (tx) {
              const categoryId = categoryMap.get(result.category);
              if (categoryId) {
                await update(tx.id, {
                  categoryId,
                  categoryConfidence: result.confidence,
                  merchant: result.merchant,
                  needsReview: result.confidence < 0.6,
                });
                categorized++;
              }
            }
          }

          setStatus(`Done! Categorized ${categorized} transactions`);
          toast.success(`Imported ${created.length} and categorized ${categorized}`);
          playSound("success");
        } catch {
          // Categorization failed, but import succeeded
          setStatus(`Import complete`);
          toast.success(`Imported ${created.length} transactions`);
          playSound("complete");
        }
      } else {
        toast.success(`Imported ${created.length} transactions`);
        playSound("success");
      }

      setTimeout(() => {
        onImportComplete();
      }, 500);
    } catch (error) {
      setStatus("Import failed");
      toast.error("Import failed");
      playSound("error");
      setIsImporting(false);
      setIsCategorizing(false);
    }
  };

  const dates = transactions.map((t) => new Date(t.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
        <Button onClick={handleImport} disabled={isImporting || isCategorizing}>
          {isImporting || isCategorizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isCategorizing ? "Categorizing…" : "Importing…"}
            </>
          ) : (
            `Import ${transactions.length}`
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
        {status && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            {(isImporting || isCategorizing) && <Sparkles className="w-4 h-4 animate-pulse" />}
            {status}
          </p>
        )}
        {aiProgress && isCategorizing && (
          <p className="text-xs text-muted-foreground mt-1">{aiProgress}</p>
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
            {transactions.slice(0, 10).map((t, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/5 transition-colors"
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
      {transactions.length > 10 && (
        <p className="text-sm text-muted-foreground text-center">
          + {transactions.length - 10} more transactions
        </p>
      )}
    </div>
  );
}

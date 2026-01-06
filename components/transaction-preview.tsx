"use client";

import { ArrowLeft, Loader2, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTransactionImport,
  PreviewTable,
  type ParsedTransaction,
} from "./transaction-preview/index";

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
  const {
    isImporting,
    isCategorizing,
    isPreloadingModel,
    isCheckingDuplicates,
    status,
    aiProgress,
    uniqueTransactions,
    duplicateCount,
    handleImport,
  } = useTransactionImport({
    filename,
    bankName,
    transactions,
    onImportComplete,
  });

  const dates =
    uniqueTransactions.length > 0
      ? uniqueTransactions.map((t) => new Date(t.date))
      : transactions.map((t) => new Date(t.date));
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
        <Button
          onClick={handleImport}
          disabled={
            isImporting ||
            isCategorizing ||
            isCheckingDuplicates ||
            uniqueTransactions.length === 0
          }
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
            {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""} found (will
            be skipped)
          </p>
        )}
        {status && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            {(isImporting || isCategorizing) && (
              <Sparkles className="w-4 h-4 animate-pulse" />
            )}
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

      <PreviewTable transactions={uniqueTransactions} maxRows={10} />
    </div>
  );
}

"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { LocalTransaction } from "@/lib/hooks/db";

interface RulePreviewStepProps {
  matchingTransactions: LocalTransaction[];
  prefillTransaction?: LocalTransaction;
  selectedCategoryName: string;
  isSearching: boolean;
  totalCount: number;
  variant: "mobile" | "desktop";
  hasConditions?: boolean;
}

export function RulePreviewStep({
  matchingTransactions,
  prefillTransaction,
  selectedCategoryName,
  isSearching,
  totalCount,
  variant,
  hasConditions = true,
}: RulePreviewStepProps) {
  const isMobile = variant === "mobile";
  const maxHeight = isMobile ? "max-h-[40vh]" : "max-h-[300px]";

  return (
    <div>
      {isMobile && (
        <p className="text-sm text-muted-foreground mb-3">
          These will be categorized as "{selectedCategoryName}":
        </p>
      )}

      {!isMobile && (
        <p className="text-sm font-medium mb-2">
          Preview ({isSearching ? "..." : totalCount} match{totalCount !== 1 ? "es" : ""})
        </p>
      )}

      <div className={`space-y-1 ${maxHeight} overflow-y-auto`}>
        {prefillTransaction && (
          <TransactionPreviewRow
            transaction={prefillTransaction}
            variant={variant}
            highlighted
          />
        )}
        {(isMobile ? matchingTransactions : matchingTransactions.slice(0, 10)).map((tx) => (
          <TransactionPreviewRow key={tx.id} transaction={tx} variant={variant} />
        ))}
        {!isMobile && matchingTransactions.length > 10 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            +{matchingTransactions.length - 10} more
          </p>
        )}
        {matchingTransactions.length === 0 && !prefillTransaction && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {hasConditions
              ? `No matching transactions${isMobile ? " found" : ""}`
              : "Enter conditions to see matches"}
          </p>
        )}
      </div>
    </div>
  );
}

interface TransactionPreviewRowProps {
  transaction: LocalTransaction;
  variant: "mobile" | "desktop";
  highlighted?: boolean;
}

function TransactionPreviewRow({
  transaction,
  variant,
  highlighted = false,
}: TransactionPreviewRowProps) {
  const isMobile = variant === "mobile";
  const baseClass = `flex items-center justify-between p-2 rounded ${
    highlighted ? "bg-muted/50" : "hover:bg-muted/30"
  }`;

  return (
    <div className={isMobile ? baseClass : `${baseClass} text-sm`}>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${isMobile ? "text-sm" : ""}`}>
          {transaction.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(transaction.date)}
        </p>
      </div>
      <span className={`font-medium tabular-nums ${isMobile ? "text-sm" : "ml-2"}`}>
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}

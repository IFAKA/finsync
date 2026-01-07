"use client";

import { formatCurrency } from "@/lib/utils";
import type { ImportTransaction } from "./use-transaction-import";

interface PreviewTableProps {
  transactions: ImportTransaction[];
  maxRows?: number;
}

export function PreviewTable({ transactions, maxRows = 10 }: PreviewTableProps) {
  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const displayTransactions = transactions.slice(0, maxRows);
  const remainingCount = transactions.length - maxRows;

  return (
    <>
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
            {displayTransactions.map((t, i) => (
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
      {remainingCount > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          + {remainingCount} more transactions
        </p>
      )}
    </>
  );
}

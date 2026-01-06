"use client";

import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalBody,
} from "@/components/ui/responsive-modal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    date: Date;
    description: string;
    rawDescription: string;
    amount: number;
    balance?: number;
    categoryId?: string;
    categoryConfidence?: number;
    merchant?: string;
    notes?: string;
    isRecurring: boolean;
    needsReview: boolean;
    importBatchId: string;
    sourceFile: string;
    bankName?: string;
    createdAt: Date;
  } | null;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const details = [
    { label: "Date", value: formatDate(transaction.date) },
    { label: "Amount", value: formatCurrency(transaction.amount), highlight: true },
    { label: "Description", value: transaction.description },
    { label: "Raw Description", value: transaction.rawDescription },
    { label: "Merchant", value: transaction.merchant },
    { label: "Balance", value: transaction.balance !== undefined ? formatCurrency(transaction.balance) : null },
    { label: "Category ID", value: transaction.categoryId },
    {
      label: "Confidence",
      value: transaction.categoryConfidence !== undefined
        ? `${Math.round(transaction.categoryConfidence * 100)}%`
        : null,
    },
    { label: "Needs Review", value: transaction.needsReview ? "Yes" : "No" },
    { label: "Recurring", value: transaction.isRecurring ? "Yes" : "No" },
    { label: "Notes", value: transaction.notes },
    { label: "Bank", value: transaction.bankName },
    { label: "Source File", value: transaction.sourceFile },
    { label: "Import Batch", value: transaction.importBatchId },
    { label: "Imported At", value: formatDate(transaction.createdAt) },
  ];

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Transaction Details</ResponsiveModalTitle>
      </ResponsiveModalHeader>
      <ResponsiveModalBody className="space-y-3 p-4 sm:p-0">
        {details.map(
          (item) =>
            item.value !== null &&
            item.value !== undefined && (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span
                  className={`text-sm ${item.highlight ? (transaction.amount >= 0 ? "text-success font-medium" : "font-medium") : ""}`}
                >
                  {item.value}
                </span>
              </div>
            )
        )}
      </ResponsiveModalBody>
    </ResponsiveModal>
  );
}

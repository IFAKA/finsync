"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalBody,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LocalCategory, LocalTransaction } from "@/lib/hooks/db";

interface SimilarTransactionsInfo {
  transactionId: string;
  similarCount: number;
}

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: LocalTransaction | null;
  categories?: LocalCategory[];
  onCategoryChange?: (transaction: LocalTransaction, categoryId: string) => void;
  similarTransactionsInfo?: SimilarTransactionsInfo | null;
  onCreateRule?: () => void;
  onDismissSimilar?: () => void;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
  categories = [],
  onCategoryChange,
  similarTransactionsInfo,
  onCreateRule,
  onDismissSimilar,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const currentCategory = categories.find((c) => c.id === transaction.categoryId);
  const showSimilarPrompt = similarTransactionsInfo?.transactionId === transaction.id;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Transaction Details</ResponsiveModalTitle>
      </ResponsiveModalHeader>
      <ResponsiveModalBody className="space-y-4 p-4 sm:p-0">
        {/* Amount - Prominent */}
        <div className="text-center py-2">
          <p
            className={`text-3xl font-semibold tabular-nums ${
              transaction.amount >= 0 ? "text-success" : ""
            }`}
          >
            {transaction.amount >= 0 ? "+" : ""}
            {formatCurrency(transaction.amount)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(transaction.date)}
          </p>
        </div>

        {/* Category Select - Editable */}
        {categories.length > 0 && onCategoryChange && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Category</label>
            <AnimatePresence mode="wait">
              {showSimilarPrompt ? (
                <motion.div
                  key="similar-prompt"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  {/* Success state showing current category */}
                  <div
                    className="flex items-center gap-2 h-10 px-3 rounded-md border border-l-4 bg-muted/30"
                    style={{ borderLeftColor: currentCategory?.color || "#888" }}
                  >
                    <Check className="w-4 h-4 text-success shrink-0" />
                    <span className="text-sm">{currentCategory?.name}</span>
                  </div>

                  {/* Similar transactions action */}
                  <button
                    onClick={() => {
                      onCreateRule?.();
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 p-3 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      {similarTransactionsInfo.similarCount} similar transaction{similarTransactionsInfo.similarCount !== 1 ? 's' : ''} found
                    </span>
                    <div className="flex items-center gap-1 text-sm">
                      <span>Create rule</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Dismiss link */}
                  <button
                    onClick={() => {
                      onDismissSimilar?.();
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Skip for now
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="category-select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <Select
                    value={transaction.categoryId || ""}
                    onValueChange={(value) => {
                      if (value) {
                        onCategoryChange(transaction, value);
                      }
                    }}
                  >
                    <SelectTrigger
                      className="w-full h-10 border-l-4"
                      style={{ borderLeftColor: currentCategory?.color || "#888" }}
                    >
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Description</label>
          <p className="text-sm">{transaction.description}</p>
        </div>

        {/* Additional Details */}
        <div className="border-t border-border pt-3 space-y-2">
          {transaction.merchant && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Merchant</span>
              <span>{transaction.merchant}</span>
            </div>
          )}
          {transaction.bankName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bank</span>
              <span>{transaction.bankName}</span>
            </div>
          )}
          {transaction.balance !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span>{formatCurrency(transaction.balance)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span>
              {transaction.categoryId ? (
                "Categorized"
              ) : (
                <span className="text-warning">Uncategorized</span>
              )}
            </span>
          </div>
        </div>
      </ResponsiveModalBody>
    </ResponsiveModal>
  );
}

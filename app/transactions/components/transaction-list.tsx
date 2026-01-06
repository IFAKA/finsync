"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDisplayName } from "@/lib/utils/display-name";
import type { LocalCategory, LocalTransaction, LocalRule } from "@/lib/hooks/db";

interface TransactionListProps {
  transactions: LocalTransaction[];
  categories: LocalCategory[];
  rules: LocalRule[];
  isLoading: boolean;
  hasFilters: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTransactionClick: (transaction: LocalTransaction) => void;
  onCategoryChange: (transaction: LocalTransaction, categoryId: string) => void;
}

export function TransactionList({
  transactions,
  categories,
  rules,
  isLoading,
  hasFilters,
  page,
  totalPages,
  onPageChange,
  onTransactionClick,
  onCategoryChange,
}: TransactionListProps) {
  const getCategoryInfo = (categoryId?: string) => {
    if (!categoryId) return { name: "Uncategorized", color: "#888" };
    const category = categories.find((c) => c.id === categoryId);
    return category
      ? { name: category.name, color: category.color }
      : { name: "Unknown", color: "#888" };
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-16 bg-border rounded" />
                        <div className="h-4 w-48 bg-border rounded" />
                      </div>
                      <div className="h-4 w-20 bg-border rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-border">
                {transactions.map((t, index) => {
                  const categoryInfo = getCategoryInfo(t.categoryId);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-muted/5 transition-colors cursor-pointer active:bg-muted/10"
                      onClick={() => onTransactionClick(t)}
                    >
                      {/* Category dot + Description */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: categoryInfo.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{getDisplayName(t, rules)}</p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {formatDate(t.date)}
                          </p>
                        </div>
                      </div>

                      {/* Desktop: Date + Category + Amount */}
                      <div
                        className="hidden md:flex items-center gap-3 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-sm text-muted-foreground w-20">
                          {formatDate(t.date)}
                        </span>
                        <Select
                          value={t.categoryId || ""}
                          onValueChange={(value) => {
                            if (value) {
                              onCategoryChange(t, value);
                            }
                          }}
                        >
                          <SelectTrigger
                            className="h-7 text-xs w-auto min-w-[120px] border-l-2"
                            style={{ borderLeftColor: categoryInfo.color }}
                          >
                            <SelectValue placeholder="Uncategorized" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span
                          className={`text-sm tabular-nums font-medium min-w-[80px] text-right ${
                            t.amount >= 0 ? "text-success" : ""
                          }`}
                        >
                          {t.amount >= 0 ? "+" : ""}
                          {formatCurrency(t.amount)}
                        </span>
                      </div>

                      {/* Mobile: Just amount */}
                      <span
                        className={`md:hidden text-sm tabular-nums font-medium shrink-0 ${
                          t.amount >= 0 ? "text-success" : ""
                        }`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {formatCurrency(t.amount)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                {hasFilters
                  ? "No transactions match your filters"
                  : "No transactions yet"}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </>
  );
}

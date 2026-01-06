"use client";

import { useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  useTransactions,
  useCategories,
  useAvailableMonths,
  type LocalTransaction,
} from "@/lib/hooks/db";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { CreateRuleModal } from "@/components/create-rule-modal";
import { useTransactionFilters, useSimilarTransactionFlow } from "./hooks";
import {
  MobileTransactionFilters,
  DesktopTransactionFilters,
  TransactionList,
  SimilarTransactionsPill,
} from "./components";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsLoading />}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="h-8 w-32 bg-border rounded animate-pulse" />
      <div className="h-10 w-full bg-border rounded animate-pulse" />
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-border rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [selectedTransaction, setSelectedTransaction] = useState<LocalTransaction | null>(null);

  // Fetch data
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: availableMonths, isLoading: monthsLoading } = useAvailableMonths();

  // Initialize filters with URL params
  const initialCategory = searchParams.get("category") || "all";
  const urlMonth = searchParams.get("month");
  const initialNeedsAttention = searchParams.get("attention") === "true";

  // Default to "all" (All Time) - only use specific month if explicitly in URL
  const initialMonth = urlMonth || "all";
  const initialSearch = searchParams.get("search") || "";
  const initialSortBy = (searchParams.get("sort") as "date" | "amount") || "date";
  const initialPage = Math.max(0, parseInt(searchParams.get("page") || "1", 10) - 1);

  // Lift filter state that affects data fetching to component level (single source of truth)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth);
  const [needsAttention, setNeedsAttention] = useState(initialNeedsAttention);

  // Memoize options for useTransactions to prevent unnecessary re-queries
  const transactionOptions = useMemo(() => ({
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    month: selectedMonth && selectedMonth !== "all" ? selectedMonth : undefined,
  }), [selectedCategory, selectedMonth]);

  // Fetch transactions with current filters
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(transactionOptions);

  // Single filter hook with callbacks to sync state
  const filters = useTransactionFilters({
    initialCategory,
    initialMonth,
    initialSearch,
    initialSortBy,
    initialPage,
    initialNeedsAttention,
    availableMonths,
    allTransactions,
    onCategoryChange: setSelectedCategory,
    onMonthChange: setSelectedMonth,
    onNeedsAttentionChange: setNeedsAttention,
  });

  // Similar transaction flow (for rule creation)
  const similarFlow = useSimilarTransactionFlow();

  const isLoading = transactionsLoading || categoriesLoading || monthsLoading;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-3 sm:space-y-6">
      <MobileTransactionFilters
        totalCount={filters.totalCount}
        search={filters.search}
        selectedCategory={filters.selectedCategory}
        selectedMonth={filters.selectedMonth}
        sortBy={filters.sortBy}
        needsAttention={filters.needsAttention}
        categories={categories}
        availableMonths={availableMonths}
        hasFilters={filters.hasFilters}
        onSearchChange={filters.setSearch}
        onCategoryChange={filters.handleCategoryFilterChange}
        onMonthChange={filters.handleMonthFilterChange}
        onSortChange={filters.setSortBy}
        onNeedsAttentionChange={filters.setNeedsAttention}
        onClearFilters={filters.clearFilters}
      />

      <DesktopTransactionFilters
        totalCount={filters.totalCount}
        search={filters.search}
        selectedCategory={filters.selectedCategory}
        selectedMonth={filters.selectedMonth}
        sortBy={filters.sortBy}
        needsAttention={filters.needsAttention}
        categories={categories}
        availableMonths={availableMonths}
        hasFilters={filters.hasFilters}
        onSearchChange={filters.setSearch}
        onCategoryChange={filters.handleCategoryFilterChange}
        onMonthChange={filters.handleMonthFilterChange}
        onSortChange={filters.setSortBy}
        onNeedsAttentionChange={filters.setNeedsAttention}
        onClearFilters={filters.clearFilters}
      />

      <TransactionList
        transactions={filters.paginatedTransactions}
        categories={categories}
        isLoading={isLoading}
        hasFilters={filters.hasFilters}
        page={filters.page}
        totalPages={filters.totalPages}
        onPageChange={filters.setPage}
        onTransactionClick={setSelectedTransaction}
        onCategoryChange={similarFlow.handleCategoryChange}
      />

      {/* Similar Transactions Pill - hidden when dialog is open (mobile shows inline UI) */}
      <AnimatePresence>
        {similarFlow.recentlyCategorized && !similarFlow.showCreateRuleModal && !selectedTransaction && (
          <SimilarTransactionsPill
            similarCount={similarFlow.recentlyCategorized.similarCount}
            onCreateRule={similarFlow.handlePillClick}
            onDismiss={similarFlow.handlePillDismiss}
          />
        )}
      </AnimatePresence>

      {/* Create Rule Modal */}
      <CreateRuleModal
        open={similarFlow.showCreateRuleModal}
        onOpenChange={similarFlow.handleModalClose}
        prefillTransaction={similarFlow.recentlyCategorized?.transaction}
        prefillCategoryId={similarFlow.recentlyCategorized?.categoryId}
        onSave={similarFlow.handleCreateRuleSave}
      />

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
        transaction={selectedTransaction}
        categories={categories}
        onCategoryChange={(t, categoryId) => {
          similarFlow.handleCategoryChange(t, categoryId);
          // Update the selected transaction state to reflect the change
          setSelectedTransaction((prev) =>
            prev && prev.id === t.id ? { ...prev, categoryId } : prev
          );
        }}
        similarTransactionsInfo={
          similarFlow.recentlyCategorized
            ? {
                transactionId: similarFlow.recentlyCategorized.transaction.id,
                similarCount: similarFlow.recentlyCategorized.similarCount,
              }
            : null
        }
        onCreateRule={similarFlow.handlePillClick}
        onDismissSimilar={similarFlow.handlePillDismiss}
      />
    </div>
  );
}

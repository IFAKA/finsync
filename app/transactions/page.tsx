"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTransactions,
  useCategories,
  useAvailableMonths,
  useTransactionMutations,
  type LocalTransaction,
} from "@/lib/hooks/use-local-db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { playSound } from "@/lib/sounds";

const PAGE_SIZE = 25;

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
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || "all"
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    searchParams.get("month") || null
  );
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LocalTransaction | null>(null);

  // Use local-db hooks
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: availableMonths, isLoading: monthsLoading } = useAvailableMonths();
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions({
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    month: selectedMonth && selectedMonth !== "all" ? selectedMonth : undefined,
  });
  const { update: updateTransaction } = useTransactionMutations();

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Filter and sort transactions client-side
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(searchLower) ||
          t.merchant?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === "amount") {
      result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    } else {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return result;
  }, [allTransactions, debouncedSearch, sortBy]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, page]);

  const totalCount = filteredTransactions.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isLoading = transactionsLoading || categoriesLoading || monthsLoading;

  // Default to most recent month if no month specified in URL
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === null) {
      setSelectedMonth(availableMonths[0]);
    } else if (availableMonths.length === 0 && selectedMonth === null) {
      setSelectedMonth("all");
    }
  }, [availableMonths, selectedMonth]);

  // Update URL when filters change
  const updateUrlParams = (category: string, month: string) => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (month !== "all") params.set("month", month);
    const newUrl = params.toString() ? `?${params.toString()}` : "/transactions";
    router.replace(newUrl, { scroll: false });
  };

  const handleCategoryChange = async (
    transaction: LocalTransaction,
    newCategoryId: string
  ) => {
    try {
      await updateTransaction(transaction.id, { categoryId: newCategoryId });
      toast.success("Category updated");
      playSound("complete");
    } catch {
      toast.error("Failed to update category");
      playSound("error");
    }
  };

  const handleCategoryFilterChange = (value: string) => {
    setSelectedCategory(value);
    setPage(0);
    updateUrlParams(value, selectedMonth || "all");
  };

  const handleMonthFilterChange = (value: string) => {
    setSelectedMonth(value);
    setPage(0);
    updateUrlParams(selectedCategory, value);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    const defaultMonth = availableMonths[0] || "all";
    setSelectedMonth(defaultMonth);
    setPage(0);
    updateUrlParams("all", defaultMonth);
  };

  const hasFilters = debouncedSearch || selectedCategory !== "all" || (selectedMonth && selectedMonth !== availableMonths[0]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const navigateMonth = (delta: number) => {
    if (!availableMonths.length || !selectedMonth || selectedMonth === "all") return;
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const newIndex = currentIndex - delta;
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      handleMonthFilterChange(availableMonths[newIndex]);
    }
  };

  const canGoNewer = availableMonths.length > 0 && selectedMonth && selectedMonth !== "all"
    ? availableMonths.indexOf(selectedMonth) > 0
    : false;
  const canGoOlder = availableMonths.length > 0 && selectedMonth && selectedMonth !== "all"
    ? availableMonths.indexOf(selectedMonth) < availableMonths.length - 1
    : false;

  const activeFilterCount = [
    debouncedSearch,
    selectedCategory !== "all",
    sortBy !== "date",
  ].filter(Boolean).length;

  // Get category info for a transaction
  const getCategoryInfo = (categoryId?: string) => {
    if (!categoryId) return { name: "Uncategorized", color: "#888" };
    const category = categories.find((c) => c.id === categoryId);
    return category ? { name: category.name, color: category.color } : { name: "Unknown", color: "#888" };
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-3 sm:space-y-6">
      {/* Mobile Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between md:hidden"
      >
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(-1)}
            disabled={!canGoOlder}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <AnimatePresence mode="wait">
            <motion.span
              key={selectedMonth}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-base font-semibold min-w-[100px] text-center"
            >
              {selectedMonth && selectedMonth !== "all" ? formatMonthLabel(selectedMonth) : "All Time"}
            </motion.span>
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(1)}
            disabled={!canGoNewer}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0 ? "bg-foreground text-background" : "hover:bg-muted/50"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && !showFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Desktop Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex items-center justify-between"
      >
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <span className="text-sm text-muted-foreground">
          {totalCount} transactions
        </span>
      </motion.div>

      {/* Mobile Filters (collapsible) */}
      {showFilters && (
        <div className="flex flex-col gap-2 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedCategory} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as "date" | "amount"); setPage(0); }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest</SelectItem>
                <SelectItem value="amount">Most Expensive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Desktop Filters */}
      <div className="hidden md:flex flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={handleCategoryFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth || ""} onValueChange={handleMonthFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v as "date" | "amount"); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Newest</SelectItem>
            <SelectItem value="amount">Most Expensive</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Transaction List */}
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
          ) : paginatedTransactions.length > 0 ? (
            <div className="divide-y divide-border">
              {paginatedTransactions.map((t, index) => {
                const categoryInfo = getCategoryInfo(t.categoryId);
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-muted/5 transition-colors cursor-pointer active:bg-muted/10"
                    onClick={() => setSelectedTransaction(t)}
                  >
                    {/* Category dot + Description */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: categoryInfo.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          {t.merchant || t.description}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {formatDate(t.date)}
                        </p>
                      </div>
                    </div>

                    {/* Desktop: Date + Category + Amount */}
                    <div className="hidden md:flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm text-muted-foreground w-20">
                        {formatDate(t.date)}
                      </span>
                      <Select
                        value={t.categoryId || ""}
                        onValueChange={(value) => {
                          if (value) {
                            handleCategoryChange(t, value);
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
            onClick={() => setPage(Math.max(0, page - 1))}
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
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </div>
  );
}

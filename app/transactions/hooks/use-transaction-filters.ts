"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LocalTransaction, LocalRule } from "@/lib/hooks/db";
import { formatMonth } from "@/lib/utils";
import { getDisplayName } from "@/lib/utils/display-name";

const PAGE_SIZE = 25;

interface UseTransactionFiltersOptions {
  initialCategory?: string;
  initialMonth?: string | null;
  initialSearch?: string;
  initialSortBy?: "date" | "amount";
  initialPage?: number;
  initialNeedsAttention?: boolean;
  availableMonths: string[];
  allTransactions: LocalTransaction[];
  rules?: LocalRule[];
  // External callbacks for when filters change (to sync with parent state)
  onCategoryChange?: (value: string) => void;
  onMonthChange?: (value: string | null) => void;
  onNeedsAttentionChange?: (value: boolean) => void;
}

export function useTransactionFilters({
  initialCategory = "all",
  initialMonth = null,
  initialSearch = "",
  initialSortBy = "date",
  initialPage = 0,
  initialNeedsAttention = false,
  availableMonths,
  allTransactions,
  rules = [],
  onCategoryChange,
  onMonthChange,
  onNeedsAttentionChange,
}: UseTransactionFiltersOptions) {
  const router = useRouter();

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth);
  const [sortBy, setSortBy] = useState<"date" | "amount">(initialSortBy);
  const [page, setPage] = useState(initialPage);
  const [needsAttention, setNeedsAttention] = useState(initialNeedsAttention);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Default to most recent month if no month specified
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === null) {
      setSelectedMonth(availableMonths[0]);
    } else if (availableMonths.length === 0 && selectedMonth === null) {
      setSelectedMonth("all");
    }
  }, [availableMonths, selectedMonth]);

  // Filter and sort transactions client-side
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    // Needs attention filter - uncategorized transactions
    if (needsAttention) {
      result = result.filter((t) => !t.categoryId);
    }

    // Search filter - also search by alias display name
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter((t) => {
        const displayName = getDisplayName(t, rules);
        return (
          t.description.toLowerCase().includes(searchLower) ||
          t.merchant?.toLowerCase().includes(searchLower) ||
          displayName.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort
    if (sortBy === "amount") {
      result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    } else {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return result;
  }, [allTransactions, debouncedSearch, sortBy, needsAttention, rules]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, page]);

  const totalCount = filteredTransactions.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Update URL when filters change
  const updateUrlParams = (updates: {
    category?: string;
    month?: string;
    search?: string;
    sort?: string;
    page?: number;
    attention?: boolean;
  }) => {
    const params = new URLSearchParams();
    const cat = updates.category ?? selectedCategory;
    const mon = updates.month ?? selectedMonth ?? "all";
    const srch = updates.search ?? debouncedSearch;
    const srt = updates.sort ?? sortBy;
    const pg = updates.page ?? page;
    const att = updates.attention ?? needsAttention;

    if (cat !== "all") params.set("category", cat);
    if (mon !== "all") params.set("month", mon);
    if (srch) params.set("search", srch);
    if (srt !== "date") params.set("sort", srt);
    if (pg > 0) params.set("page", String(pg + 1)); // 1-indexed for URL
    if (att) params.set("attention", "true");

    const newUrl = params.toString() ? `?${params.toString()}` : "/transactions";
    router.replace(newUrl, { scroll: false });
  };

  const handleCategoryFilterChange = (value: string) => {
    setSelectedCategory(value);
    setPage(0);
    updateUrlParams({ category: value, page: 0 });
    onCategoryChange?.(value);
  };

  const handleMonthFilterChange = (value: string) => {
    setSelectedMonth(value);
    setPage(0);
    updateUrlParams({ month: value, page: 0 });
    onMonthChange?.(value);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  // Update URL when debounced search changes
  useEffect(() => {
    // Only update URL after initial render when search actually changes
    if (debouncedSearch !== initialSearch) {
      updateUrlParams({ search: debouncedSearch, page: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleSortChange = (value: "date" | "amount") => {
    setSortBy(value);
    setPage(0);
    updateUrlParams({ sort: value, page: 0 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  const handleNeedsAttentionChange = (value: boolean) => {
    setNeedsAttention(value);
    setPage(0);
    updateUrlParams({ attention: value, page: 0 });
    onNeedsAttentionChange?.(value);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSelectedMonth("all");
    setSortBy("date");
    setPage(0);
    setNeedsAttention(false);
    router.replace("/transactions", { scroll: false });
    onCategoryChange?.("all");
    onMonthChange?.("all");
    onNeedsAttentionChange?.(false);
  };

  // "all" is the default for month, so selecting a specific month IS a filter
  const hasFilters = Boolean(
    debouncedSearch ||
    selectedCategory !== "all" ||
    sortBy !== "date" ||
    needsAttention ||
    (selectedMonth && selectedMonth !== "all")
  );

  const activeFilterCount = [
    debouncedSearch,
    selectedCategory !== "all",
    sortBy !== "date",
    needsAttention,
    selectedMonth && selectedMonth !== "all",
  ].filter(Boolean).length;

  const navigateMonth = (delta: number) => {
    if (!availableMonths.length || !selectedMonth || selectedMonth === "all") return;
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const newIndex = currentIndex - delta;
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      handleMonthFilterChange(availableMonths[newIndex]);
    }
  };

  const canGoNewer =
    availableMonths.length > 0 && selectedMonth && selectedMonth !== "all"
      ? availableMonths.indexOf(selectedMonth) > 0
      : false;

  const canGoOlder =
    availableMonths.length > 0 && selectedMonth && selectedMonth !== "all"
      ? availableMonths.indexOf(selectedMonth) < availableMonths.length - 1
      : false;

  return {
    // State
    search,
    debouncedSearch,
    selectedCategory,
    selectedMonth,
    sortBy,
    page,
    needsAttention,
    // Computed
    filteredTransactions,
    paginatedTransactions,
    totalCount,
    totalPages,
    hasFilters,
    activeFilterCount,
    canGoNewer,
    canGoOlder,
    // Actions
    setSearch: handleSearchChange,
    setPage: handlePageChange,
    setSortBy: handleSortChange,
    setNeedsAttention: handleNeedsAttentionChange,
    handleCategoryFilterChange,
    handleMonthFilterChange,
    clearFilters,
    navigateMonth,
  };
}

export function formatMonthLabel(monthStr: string): string {
  return formatMonth(monthStr, { month: "short" });
}

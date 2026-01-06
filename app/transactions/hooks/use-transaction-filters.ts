"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LocalTransaction } from "@/lib/hooks/db";

const PAGE_SIZE = 25;

interface UseTransactionFiltersOptions {
  initialCategory?: string;
  initialMonth?: string | null;
  availableMonths: string[];
  allTransactions: LocalTransaction[];
}

export function useTransactionFilters({
  initialCategory = "all",
  initialMonth = null,
  availableMonths,
  allTransactions,
}: UseTransactionFiltersOptions) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [page, setPage] = useState(0);

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

  // Update URL when filters change
  const updateUrlParams = (category: string, month: string) => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (month !== "all") params.set("month", month);
    const newUrl = params.toString() ? `?${params.toString()}` : "/transactions";
    router.replace(newUrl, { scroll: false });
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

  const hasFilters = Boolean(
    debouncedSearch ||
    selectedCategory !== "all" ||
    (selectedMonth && selectedMonth !== availableMonths[0])
  );

  const activeFilterCount = [
    debouncedSearch,
    selectedCategory !== "all",
    sortBy !== "date",
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
    setSearch,
    setPage,
    setSortBy,
    handleCategoryFilterChange,
    handleMonthFilterChange,
    clearFilters,
    navigateMonth,
  };
}

export function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

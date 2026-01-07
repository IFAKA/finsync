"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, AlertTriangle, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocalCategory } from "@/lib/hooks/db";
import { formatMonthLabel } from "../hooks/use-transaction-filters";
import {
  parseNLQueryLocal,
  isNaturalLanguageQuery,
} from "@/lib/ai/web-llm";

interface NLSearchState {
  isNLMode: boolean;
  parsedDescription: string | null;
}

interface MobileFiltersProps {
  totalCount: number;
  search: string;
  selectedCategory: string;
  selectedMonth: string | null;
  sortBy: "date" | "amount";
  needsAttention: boolean;
  categories: LocalCategory[];
  availableMonths: string[];
  hasFilters: boolean;
  amountMin?: number;
  amountMax?: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSortChange: (value: "date" | "amount") => void;
  onNeedsAttentionChange: (value: boolean) => void;
  onClearFilters: () => void;
  onApplyNLFilters?: (filters: {
    search?: string;
    category?: string;
    month?: string;
    sortBy?: "date" | "amount";
    amountMin?: number;
    amountMax?: number;
  }) => void;
}

// Helper to generate description of parsed NL query
function getNLDescription(
  parsed: ReturnType<typeof parseNLQueryLocal>
): string | null {
  const parts: string[] = [];

  if (parsed.category) {
    parts.push(parsed.category);
  }
  if (parsed.amountMin !== undefined) {
    parts.push(`over €${parsed.amountMin}`);
  }
  if (parsed.amountMax !== undefined) {
    parts.push(`under €${parsed.amountMax}`);
  }
  if (parsed.month) {
    const [year, monthNum] = parsed.month.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    parts.push(`${monthNames[parseInt(monthNum) - 1]} ${year}`);
  }
  if (parsed.sortBy === "amount") {
    parts.push("by amount");
  }
  if (parsed.search) {
    parts.push(`"${parsed.search}"`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function MobileTransactionFilters({
  totalCount,
  search,
  selectedCategory,
  selectedMonth,
  sortBy,
  needsAttention,
  categories,
  availableMonths,
  hasFilters,
  onSearchChange,
  onCategoryChange,
  onMonthChange,
  onSortChange,
  onNeedsAttentionChange,
  onClearFilters,
  onApplyNLFilters,
}: MobileFiltersProps) {
  const [nlState, setNLState] = useState<NLSearchState>({
    isNLMode: false,
    parsedDescription: null,
  });

  const categoryNames = categories.map((c) => c.name);

  const handleSearchChange = useCallback(
    (value: string) => {
      onSearchChange(value);

      // Reset NL state if search is cleared
      if (!value.trim()) {
        setNLState({ isNLMode: false, parsedDescription: null });
        return;
      }

      // Check if this looks like natural language
      if (isNaturalLanguageQuery(value) && onApplyNLFilters) {
        const parsed = parseNLQueryLocal(value, categoryNames);
        const description = getNLDescription(parsed);
        setNLState({ isNLMode: true, parsedDescription: description });

        // Find category ID
        let categoryId: string | undefined;
        if (parsed.category) {
          const cat = categories.find(
            (c) => c.name.toLowerCase() === parsed.category!.toLowerCase()
          );
          categoryId = cat?.id;
        }

        // Validate month
        let month = parsed.month;
        if (month && !availableMonths.includes(month)) {
          month = undefined;
        }

        onApplyNLFilters({
          search: parsed.search,
          category: categoryId,
          month,
          sortBy: parsed.sortBy,
          amountMin: parsed.amountMin,
          amountMax: parsed.amountMax,
        });
      } else {
        setNLState({ isNLMode: false, parsedDescription: null });
      }
    },
    [onSearchChange, onApplyNLFilters, categoryNames, categories, availableMonths]
  );

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        {needsAttention ? (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">Needs Attention</span>
            <button
              onClick={() => onNeedsAttentionChange(false)}
              className="p-0.5 hover:bg-warning/20 rounded ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div />
        )}
        <span className="text-sm text-muted-foreground">{totalCount} transactions</span>
      </div>

      {/* Search with NL indicator */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search or try 'groceries over €50'..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`pl-9 h-9 ${nlState.isNLMode ? "pr-9 border-primary/50" : ""}`}
          />
          <AnimatePresence>
            {nlState.isNLMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {nlState.parsedDescription && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 text-xs text-primary overflow-hidden"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">{nlState.parsedDescription}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters */}
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{cat.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedMonth || "all"} onValueChange={onMonthChange}>
        <SelectTrigger className="h-9">
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

      <Select value={sortBy} onValueChange={(v) => onSortChange(v as "date" | "amount")}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Newest</SelectItem>
          <SelectItem value="amount">Expensive</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}

interface DesktopFiltersProps {
  totalCount: number;
  search: string;
  selectedCategory: string;
  selectedMonth: string | null;
  sortBy: "date" | "amount";
  needsAttention: boolean;
  categories: LocalCategory[];
  availableMonths: string[];
  hasFilters: boolean;
  amountMin?: number;
  amountMax?: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSortChange: (value: "date" | "amount") => void;
  onNeedsAttentionChange: (value: boolean) => void;
  onClearFilters: () => void;
  onApplyNLFilters?: (filters: {
    search?: string;
    category?: string;
    month?: string;
    sortBy?: "date" | "amount";
    amountMin?: number;
    amountMax?: number;
  }) => void;
}

export function DesktopTransactionFilters({
  totalCount,
  search,
  selectedCategory,
  selectedMonth,
  sortBy,
  needsAttention,
  categories,
  availableMonths,
  hasFilters,
  onSearchChange,
  onCategoryChange,
  onMonthChange,
  onSortChange,
  onNeedsAttentionChange,
  onClearFilters,
  onApplyNLFilters,
}: DesktopFiltersProps) {
  const [nlState, setNLState] = useState<NLSearchState>({
    isNLMode: false,
    parsedDescription: null,
  });

  const categoryNames = categories.map((c) => c.name);

  const handleSearchChange = useCallback(
    (value: string) => {
      onSearchChange(value);

      // Reset NL state if search is cleared
      if (!value.trim()) {
        setNLState({ isNLMode: false, parsedDescription: null });
        return;
      }

      // Check if this looks like natural language
      if (isNaturalLanguageQuery(value) && onApplyNLFilters) {
        const parsed = parseNLQueryLocal(value, categoryNames);
        const description = getNLDescription(parsed);
        setNLState({ isNLMode: true, parsedDescription: description });

        // Find category ID
        let categoryId: string | undefined;
        if (parsed.category) {
          const cat = categories.find(
            (c) => c.name.toLowerCase() === parsed.category!.toLowerCase()
          );
          categoryId = cat?.id;
        }

        // Validate month
        let month = parsed.month;
        if (month && !availableMonths.includes(month)) {
          month = undefined;
        }

        onApplyNLFilters({
          search: parsed.search,
          category: categoryId,
          month,
          sortBy: parsed.sortBy,
          amountMin: parsed.amountMin,
          amountMax: parsed.amountMax,
        });
      } else {
        setNLState({ isNLMode: false, parsedDescription: null });
      }
    },
    [onSearchChange, onApplyNLFilters, categoryNames, categories, availableMonths]
  );

  return (
    <>
      {/* Desktop Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Transactions</h1>
          {needsAttention && (
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Needs Attention</span>
              <button
                onClick={() => onNeedsAttentionChange(false)}
                className="p-0.5 hover:bg-warning/20 rounded ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{totalCount} transactions</span>
      </motion.div>

      {/* Desktop Filters */}
      <div className="hidden md:flex flex-col gap-2">
        <div className="flex flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search or try 'groceries over €50 last month'..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`pl-9 ${nlState.isNLMode ? "pr-9 border-primary/50" : ""}`}
            />
            <AnimatePresence>
              {nlState.isNLMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth || ""} onValueChange={onMonthChange}>
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
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as "date" | "amount")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Newest</SelectItem>
            <SelectItem value="amount">Most Expensive</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={onClearFilters} aria-label="Clear filters">
            <X className="w-4 h-4" />
          </Button>
        )}
        </div>
        <AnimatePresence>
          {nlState.parsedDescription && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 text-xs text-primary overflow-hidden"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Smart search: {nlState.parsedDescription}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

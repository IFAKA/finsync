"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, AlertTriangle } from "lucide-react";
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

interface MobileFiltersProps {
  selectedMonth: string | null;
  availableMonths: string[];
  canGoNewer: boolean;
  canGoOlder: boolean;
  showFilters: boolean;
  activeFilterCount: number;
  search: string;
  selectedCategory: string;
  sortBy: "date" | "amount";
  needsAttention: boolean;
  categories: LocalCategory[];
  hasFilters: boolean;
  onNavigateMonth: (delta: number) => void;
  onToggleFilters: () => void;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSortChange: (value: "date" | "amount") => void;
  onNeedsAttentionChange: (value: boolean) => void;
  onClearFilters: () => void;
}

export function MobileTransactionFilters({
  selectedMonth,
  availableMonths,
  canGoNewer,
  canGoOlder,
  showFilters,
  activeFilterCount,
  search,
  selectedCategory,
  sortBy,
  needsAttention,
  categories,
  hasFilters,
  onNavigateMonth,
  onToggleFilters,
  onSearchChange,
  onCategoryChange,
  onMonthChange,
  onSortChange,
  onNeedsAttentionChange,
  onClearFilters,
}: MobileFiltersProps) {
  return (
    <>
      {/* Mobile Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between md:hidden"
      >
        {needsAttention ? (
          // When viewing needs attention, show label with close button
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
          // Month selector with navigation
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateMonth(-1)}
              disabled={!canGoOlder}
              aria-label="Previous month"
              className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <Select value={selectedMonth || "all"} onValueChange={onMonthChange}>
              <SelectTrigger className="h-9 w-[120px] border-0 bg-transparent font-semibold justify-center gap-1 px-1 focus:ring-0 focus:ring-offset-0">
                <SelectValue>
                  {selectedMonth && selectedMonth !== "all"
                    ? formatMonthLabel(selectedMonth)
                    : "All Time"}
                </SelectValue>
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
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateMonth(1)}
              disabled={!canGoNewer}
              aria-label="Next month"
              className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFilters}
            aria-label={showFilters ? "Hide filters" : "Show filters"}
            aria-expanded={showFilters}
            className={`relative h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-foreground text-background"
                : "hover:bg-muted/50"
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

      {/* Mobile Filters (collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 md:hidden overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
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
                  <SelectItem value="amount">Most Expensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSortChange: (value: "date" | "amount") => void;
  onNeedsAttentionChange: (value: boolean) => void;
  onClearFilters: () => void;
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
}: DesktopFiltersProps) {
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
      <div className="hidden md:flex flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
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
    </>
  );
}

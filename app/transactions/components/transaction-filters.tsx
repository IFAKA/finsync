"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
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
  categories: LocalCategory[];
  hasFilters: boolean;
  onNavigateMonth: (delta: number) => void;
  onToggleFilters: () => void;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: "date" | "amount") => void;
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
  categories,
  hasFilters,
  onNavigateMonth,
  onToggleFilters,
  onSearchChange,
  onCategoryChange,
  onSortChange,
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
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigateMonth(-1)}
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
              {selectedMonth && selectedMonth !== "all"
                ? formatMonthLabel(selectedMonth)
                : "All Time"}
            </motion.span>
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigateMonth(1)}
            disabled={!canGoNewer}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFilters}
            className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${
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
      {showFilters && (
        <div className="flex flex-col gap-2 md:hidden">
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
        </div>
      )}
    </>
  );
}

interface DesktopFiltersProps {
  totalCount: number;
  search: string;
  selectedCategory: string;
  selectedMonth: string | null;
  sortBy: "date" | "amount";
  categories: LocalCategory[];
  availableMonths: string[];
  hasFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSortChange: (value: "date" | "amount") => void;
  onClearFilters: () => void;
}

export function DesktopTransactionFilters({
  totalCount,
  search,
  selectedCategory,
  selectedMonth,
  sortBy,
  categories,
  availableMonths,
  hasFilters,
  onSearchChange,
  onCategoryChange,
  onMonthChange,
  onSortChange,
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
        <h1 className="text-2xl font-semibold">Transactions</h1>
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
          <Button variant="ghost" size="icon" onClick={onClearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </>
  );
}

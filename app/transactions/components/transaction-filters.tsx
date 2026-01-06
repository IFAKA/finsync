"use client";

import { motion } from "framer-motion";
import { Search, X, AlertTriangle } from "lucide-react";
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
}: MobileFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Transactions</h1>
          {needsAttention && (
            <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 rounded-full px-2 py-0.5">
              <AlertTriangle className="w-3 h-3 text-warning" />
              <span className="text-xs font-medium">Needs Attention</span>
              <button
                onClick={() => onNeedsAttentionChange(false)}
                className="p-0.5 hover:bg-warning/20 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{totalCount} items</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Filters row */}
      <div className="flex gap-2">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0">
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
          <SelectTrigger className="h-9 w-[100px] shrink-0">
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
          <SelectTrigger className="h-9 w-[90px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Newest</SelectItem>
            <SelectItem value="amount">Expensive</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={onClearFilters} className="h-9 w-9 shrink-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
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

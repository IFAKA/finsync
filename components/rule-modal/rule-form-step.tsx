"use client";

import { Input } from "@/components/ui/input";
import type { LocalCategory } from "@/lib/hooks/db";
import type { RuleCriteria } from "./use-rule-form";

interface RuleFormStepProps {
  criteria: RuleCriteria;
  categories: LocalCategory[];
  isSearching: boolean;
  totalCount: number;
  selectedCategoryName: string;
  variant: "mobile" | "desktop";
  onCriteriaChange: (updates: Partial<RuleCriteria>) => void;
}

export function RuleFormStep({
  criteria,
  categories,
  isSearching,
  totalCount,
  variant,
  onCriteriaChange,
}: RuleFormStepProps) {
  const isMobile = variant === "mobile";

  return (
    <div className="space-y-4">
      {/* Rule Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Rule Name</label>
        <Input
          placeholder="e.g., Monthly Rent"
          value={criteria.name}
          onChange={(e) => onCriteriaChange({ name: e.target.value })}
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Category</label>
        <select
          className={`w-full ${isMobile ? "h-10" : "h-9"} px-3 border rounded-md bg-background text-sm`}
          value={criteria.categoryId}
          onChange={(e) => onCriteriaChange({ categoryId: e.target.value })}
        >
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Match transactions where:</p>

        {/* Description Contains */}
        {isMobile ? (
          <div
            className={`p-3 rounded-lg border-2 transition-colors ${
              criteria.descriptionContains ? "border-foreground bg-muted/30" : "border-border"
            }`}
          >
            <label className="text-xs font-medium text-muted-foreground">
              Description contains
            </label>
            <Input
              className="mt-1.5 border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0"
              placeholder="e.g., TRANSFER TO 5678"
              value={criteria.descriptionContains}
              onChange={(e) => onCriteriaChange({ descriptionContains: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description contains
              </label>
              <Input
                placeholder="e.g., TRANSFER TO 5678"
                value={criteria.descriptionContains}
                onChange={(e) => onCriteriaChange({ descriptionContains: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Amount Filter */}
        {isMobile ? (
          <div
            className={`mt-3 p-3 rounded-lg border-2 transition-colors ${
              criteria.useAmountFilter ? "border-foreground bg-muted/30" : "border-border"
            }`}
            onClick={() => onCriteriaChange({ useAmountFilter: !criteria.useAmountFilter })}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Amount between
              </label>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  criteria.useAmountFilter
                    ? "border-foreground bg-foreground"
                    : "border-muted-foreground"
                }`}
              >
                {criteria.useAmountFilter && (
                  <div className="w-2 h-2 rounded-full bg-background" />
                )}
              </div>
            </div>
            {criteria.useAmountFilter && (
              <div
                className="flex gap-2 mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Min"
                  value={criteria.amountMin}
                  onChange={(e) => onCriteriaChange({ amountMin: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Max"
                  value={criteria.amountMax}
                  onChange={(e) => onCriteriaChange({ amountMax: e.target.value })}
                  className="flex-1"
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="useAmount"
                checked={criteria.useAmountFilter}
                onChange={(e) => onCriteriaChange({ useAmountFilter: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="useAmount" className="text-sm">
                Filter by amount
              </label>
            </div>

            {criteria.useAmountFilter && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Min</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-500"
                    value={criteria.amountMin}
                    onChange={(e) => onCriteriaChange({ amountMin: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Max</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-300"
                    value={criteria.amountMax}
                    onChange={(e) => onCriteriaChange({ amountMax: e.target.value })}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Match count (mobile only) */}
      {isMobile && (
        <div className="text-center text-sm text-muted-foreground pt-2">
          {isSearching ? (
            "Searching..."
          ) : (
            <span>
              <strong>{totalCount}</strong> transaction{totalCount !== 1 ? "s" : ""} match
            </span>
          )}
        </div>
      )}
    </div>
  );
}

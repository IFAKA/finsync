"use client";

import { Input } from "@/components/ui/input";
import type { LocalCategory } from "@/lib/hooks/db";
import type { RuleCriteria } from "./use-rule-form";
import type { AmountMatchType } from "@/lib/db/schema";

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
          <option value="">No category change</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Display Name (Alias) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Display As</label>
        <Input
          placeholder="e.g., Rent"
          value={criteria.displayName}
          onChange={(e) => onCriteriaChange({ displayName: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {criteria.categoryId && criteria.displayName
            ? "Will set category and rename"
            : criteria.displayName
              ? "Will rename matching transactions"
              : "Optional - leave empty to only set category"}
        </p>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Conditions (at least one)</p>
        <div className="space-y-3">
          {/* Description contains */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description Contains</label>
            <Input
              placeholder="ALQUILER"
              value={criteria.descriptionContains}
              onChange={(e) => onCriteriaChange({ descriptionContains: e.target.value })}
            />
          </div>

          {/* Amount mode toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount Condition</label>
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {([
                { value: "none", label: "None" },
                { value: "exact", label: "Exact" },
                { value: "range", label: "Range" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onCriteriaChange({
                    amountMode: opt.value,
                    ...(opt.value === 'none' ? { amountEquals: "", amountMin: "", amountMax: "" } : {}),
                    ...(opt.value === 'exact' ? { amountMin: "", amountMax: "" } : {}),
                    ...(opt.value === 'range' ? { amountEquals: "" } : {}),
                  })}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    criteria.amountMode === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expense/Income/Both toggle - only show when amount mode is not 'none' */}
          {criteria.amountMode !== 'none' && (
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {([
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
                { value: "absolute", label: "Both" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onCriteriaChange({ amountMatchType: opt.value as AmountMatchType })}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    criteria.amountMatchType === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Exact amount input */}
          {criteria.amountMode === 'exact' && (
            <Input
              type="number"
              step="0.01"
              placeholder="Exact amount (e.g., 395)"
              value={criteria.amountEquals}
              onChange={(e) => onCriteriaChange({ amountEquals: e.target.value })}
            />
          )}

          {/* Range inputs */}
          {criteria.amountMode === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Min</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="300"
                  value={criteria.amountMin}
                  onChange={(e) => onCriteriaChange({ amountMin: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Max</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="500"
                  value={criteria.amountMax}
                  onChange={(e) => onCriteriaChange({ amountMax: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
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

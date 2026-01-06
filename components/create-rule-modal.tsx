"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalBody,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import {
  useCategories,
  useFindSimilarTransactions,
  type LocalTransaction,
  type LocalCategory,
} from "@/lib/hooks/use-local-db";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface RuleCriteria {
  name: string;
  categoryId: string;
  descriptionContains: string;
  amountEquals: string;
  amountMin: string;
  amountMax: string;
  useAmountFilter: boolean;
}

export interface CreateRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-fill from a transaction
  prefillTransaction?: LocalTransaction;
  prefillCategoryId?: string;
  // Callback when rule is saved
  onSave: (
    criteria: {
      name: string;
      categoryId: string;
      descriptionContains?: string;
      amountEquals?: number;
      amountMin?: number;
      amountMax?: number;
    },
    matchingTransactionIds: string[]
  ) => void;
}

export function CreateRuleModal({
  open,
  onOpenChange,
  prefillTransaction,
  prefillCategoryId,
  onSave,
}: CreateRuleModalProps) {
  const isMobile = useIsMobile();
  const { data: categories } = useCategories();
  const { findSimilar } = useFindSimilarTransactions();

  // Mobile step: 0 = criteria, 1 = preview
  const [step, setStep] = useState(0);

  // Form state
  const [criteria, setCriteria] = useState<RuleCriteria>({
    name: "",
    categoryId: "",
    descriptionContains: "",
    amountEquals: "",
    amountMin: "",
    amountMax: "",
    useAmountFilter: false,
  });

  // Matching transactions
  const [matchingTransactions, setMatchingTransactions] = useState<LocalTransaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize form when prefill changes
  useEffect(() => {
    if (open && prefillTransaction) {
      const desc = prefillTransaction.rawDescription || prefillTransaction.description;
      const amount = prefillTransaction.amount;
      const tolerance = Math.abs(amount * 0.05); // 5% tolerance

      setCriteria({
        name: `${desc.slice(0, 30)}${desc.length > 30 ? "..." : ""}`,
        categoryId: prefillCategoryId || "",
        descriptionContains: desc,
        amountEquals: "",
        amountMin: (amount - tolerance).toFixed(2),
        amountMax: (amount + tolerance).toFixed(2),
        useAmountFilter: false,
      });
      setStep(0);
    } else if (open && !prefillTransaction) {
      // Reset for standalone mode
      setCriteria({
        name: "",
        categoryId: "",
        descriptionContains: "",
        amountEquals: "",
        amountMin: "",
        amountMax: "",
        useAmountFilter: false,
      });
      setStep(0);
    }
  }, [open, prefillTransaction, prefillCategoryId]);

  // Search for matching transactions when criteria changes
  const searchMatches = useCallback(async () => {
    setIsSearching(true);
    try {
      const searchCriteria: {
        descriptionContains?: string;
        amountMin?: number;
        amountMax?: number;
        amountEquals?: number;
      } = {};

      if (criteria.descriptionContains) {
        searchCriteria.descriptionContains = criteria.descriptionContains;
      }

      if (criteria.useAmountFilter) {
        if (criteria.amountEquals) {
          searchCriteria.amountEquals = parseFloat(criteria.amountEquals);
        } else {
          if (criteria.amountMin) {
            searchCriteria.amountMin = parseFloat(criteria.amountMin);
          }
          if (criteria.amountMax) {
            searchCriteria.amountMax = parseFloat(criteria.amountMax);
          }
        }
      }

      const matches = await findSimilar(searchCriteria, prefillTransaction?.id);
      setMatchingTransactions(matches);
    } catch (error) {
      console.error("Error searching matches:", error);
      setMatchingTransactions([]);
    }
    setIsSearching(false);
  }, [criteria, findSimilar, prefillTransaction?.id]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(searchMatches, 300);
    return () => clearTimeout(timeout);
  }, [open, searchMatches]);

  const getCategoryInfo = (categoryId?: string): { name: string; color: string } => {
    if (!categoryId) return { name: "Unknown", color: "#888" };
    const category = categories.find((c: LocalCategory) => c.id === categoryId);
    return category ? { name: category.name, color: category.color } : { name: "Unknown", color: "#888" };
  };

  const selectedCategory = getCategoryInfo(criteria.categoryId);

  const handleSave = () => {
    const ruleCriteria: {
      name: string;
      categoryId: string;
      descriptionContains?: string;
      amountEquals?: number;
      amountMin?: number;
      amountMax?: number;
    } = {
      name: criteria.name,
      categoryId: criteria.categoryId,
    };

    if (criteria.descriptionContains) {
      ruleCriteria.descriptionContains = criteria.descriptionContains;
    }

    if (criteria.useAmountFilter) {
      if (criteria.amountEquals) {
        ruleCriteria.amountEquals = parseFloat(criteria.amountEquals);
      } else {
        if (criteria.amountMin) {
          ruleCriteria.amountMin = parseFloat(criteria.amountMin);
        }
        if (criteria.amountMax) {
          ruleCriteria.amountMax = parseFloat(criteria.amountMax);
        }
      }
    }

    const matchingIds = matchingTransactions.map((t) => t.id);
    onSave(ruleCriteria, matchingIds);
  };

  const canProceed =
    criteria.name &&
    criteria.categoryId &&
    (criteria.descriptionContains ||
      (criteria.useAmountFilter &&
        (criteria.amountEquals || criteria.amountMin || criteria.amountMax)));

  const totalCount = matchingTransactions.length + (prefillTransaction ? 1 : 0);

  // Mobile: Two-step flow
  if (isMobile) {
    return (
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>
                  Create Rule{criteria.categoryId && ` for "${selectedCategory.name}"`}
                </ResponsiveModalTitle>
              </ResponsiveModalHeader>

              <ResponsiveModalBody className="p-4 space-y-4">
                {/* Rule Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Rule Name</label>
                  <Input
                    placeholder="e.g., Monthly Rent"
                    value={criteria.name}
                    onChange={(e) => setCriteria({ ...criteria, name: e.target.value })}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                    value={criteria.categoryId}
                    onChange={(e) => setCriteria({ ...criteria, categoryId: e.target.value })}
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat: LocalCategory) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Match transactions where:</p>

                  {/* Description Contains */}
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
                      onChange={(e) =>
                        setCriteria({ ...criteria, descriptionContains: e.target.value })
                      }
                    />
                  </div>

                  {/* Amount Filter */}
                  <div
                    className={`mt-3 p-3 rounded-lg border-2 transition-colors ${
                      criteria.useAmountFilter ? "border-foreground bg-muted/30" : "border-border"
                    }`}
                    onClick={() =>
                      setCriteria({ ...criteria, useAmountFilter: !criteria.useAmountFilter })
                    }
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
                          onChange={(e) =>
                            setCriteria({ ...criteria, amountMin: e.target.value })
                          }
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Max"
                          value={criteria.amountMax}
                          onChange={(e) =>
                            setCriteria({ ...criteria, amountMax: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Match count */}
                <div className="text-center text-sm text-muted-foreground pt-2">
                  {isSearching ? (
                    "Searching..."
                  ) : (
                    <span>
                      <strong>{totalCount}</strong> transaction{totalCount !== 1 ? "s" : ""} match
                    </span>
                  )}
                </div>
              </ResponsiveModalBody>

              <ResponsiveModalFooter className="p-4 pt-0">
                <Button
                  className="w-full"
                  onClick={() => setStep(1)}
                  disabled={!canProceed}
                >
                  See matches
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </ResponsiveModalFooter>
            </motion.div>
          ) : (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ResponsiveModalHeader className="flex-row items-center gap-2">
                <button
                  onClick={() => setStep(0)}
                  className="p-1 -ml-1 hover:bg-muted rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <ResponsiveModalTitle className="flex-1">
                  {totalCount} match{totalCount !== 1 ? "es" : ""}
                </ResponsiveModalTitle>
              </ResponsiveModalHeader>

              <ResponsiveModalBody className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  These will be categorized as "{selectedCategory.name}":
                </p>
                <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                  {prefillTransaction && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          {prefillTransaction.merchant || prefillTransaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(prefillTransaction.date)}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(prefillTransaction.amount)}
                      </span>
                    </div>
                  )}
                  {matchingTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{tx.merchant || tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                  {matchingTransactions.length === 0 && !prefillTransaction && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No matching transactions found
                    </p>
                  )}
                </div>
              </ResponsiveModalBody>

              <ResponsiveModalFooter className="p-4 pt-0">
                <Button className="w-full" onClick={handleSave}>
                  Save & Apply to {totalCount}
                </Button>
              </ResponsiveModalFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveModal>
    );
  }

  // Desktop: Single view with inline preview
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Create Rule</ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <div className="grid grid-cols-2 gap-6 p-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rule Name</label>
            <Input
              placeholder="e.g., Monthly Rent"
              value={criteria.name}
              onChange={(e) => setCriteria({ ...criteria, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full h-9 px-3 border rounded-md bg-background text-sm"
              value={criteria.categoryId}
              onChange={(e) => setCriteria({ ...criteria, categoryId: e.target.value })}
            >
              <option value="">Select category...</option>
              {categories.map((cat: LocalCategory) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Match transactions where:</p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description contains
                </label>
                <Input
                  placeholder="e.g., TRANSFER TO 5678"
                  value={criteria.descriptionContains}
                  onChange={(e) =>
                    setCriteria({ ...criteria, descriptionContains: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useAmount"
                  checked={criteria.useAmountFilter}
                  onChange={(e) =>
                    setCriteria({ ...criteria, useAmountFilter: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="useAmount" className="text-sm">
                  Filter by amount
                </label>
              </div>

              {criteria.useAmountFilter && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="-500"
                      value={criteria.amountMin}
                      onChange={(e) =>
                        setCriteria({ ...criteria, amountMin: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="-300"
                      value={criteria.amountMax}
                      onChange={(e) =>
                        setCriteria({ ...criteria, amountMax: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="border-l pl-6">
          <p className="text-sm font-medium mb-2">
            Preview ({isSearching ? "..." : totalCount} match{totalCount !== 1 ? "es" : ""})
          </p>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {prefillTransaction && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {prefillTransaction.merchant || prefillTransaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(prefillTransaction.date)}
                  </p>
                </div>
                <span className="font-medium tabular-nums ml-2">
                  {formatCurrency(prefillTransaction.amount)}
                </span>
              </div>
            )}
            {matchingTransactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/30 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate">{tx.merchant || tx.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                </div>
                <span className="font-medium tabular-nums ml-2">
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
            {matchingTransactions.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{matchingTransactions.length - 10} more
              </p>
            )}
            {matchingTransactions.length === 0 && !prefillTransaction && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matching transactions
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-6 pt-0 border-t mt-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canProceed}>
          Save & Apply to {totalCount}
        </Button>
      </div>
    </ResponsiveModal>
  );
}

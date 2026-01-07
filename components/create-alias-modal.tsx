"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/lib/hooks/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface CreateAliasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: LocalTransaction;
  existingRule?: {
    id: string;
    displayName?: string;
    descriptionContains?: string;
    categoryId?: string;
  };
  onSave: (
    criteria: {
      name: string;
      displayName: string;
      descriptionContains: string;
      categoryId?: string;
    },
    matchingTransactionIds: string[]
  ) => void;
  onUpdate?: (
    ruleId: string,
    criteria: {
      displayName: string;
      descriptionContains: string;
      categoryId?: string;
    },
    matchingTransactionIds: string[]
  ) => void;
}

interface AliasCriteria {
  displayName: string;
  pattern: string;
  categoryId: string;
}

function extractPattern(description: string): string {
  // Try to extract a meaningful pattern from the description
  // Remove common prefixes/suffixes, dates, reference numbers
  const cleaned = description
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, "") // Remove dates
    .replace(/\d{6,}/g, "") // Remove long numbers (references)
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Return the cleaned version, or original if too short
  return cleaned.length > 3 ? cleaned : description;
}

export function CreateAliasModal({
  open,
  onOpenChange,
  transaction,
  existingRule,
  onSave,
  onUpdate,
}: CreateAliasModalProps) {
  const isEditing = !!existingRule;
  const isMobile = useIsMobile();
  const { data: categories } = useCategories();
  const { findSimilar } = useFindSimilarTransactions();

  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<AliasCriteria>({
    displayName: "",
    pattern: "",
    categoryId: "",
  });
  const [matchingTransactions, setMatchingTransactions] = useState<LocalTransaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const displayNameInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when transaction changes
  useEffect(() => {
    if (open && transaction) {
      if (existingRule) {
        // Editing existing alias - pre-fill from rule
        setCriteria({
          displayName: existingRule.displayName || "",
          pattern: existingRule.descriptionContains || "",
          categoryId: existingRule.categoryId || "",
        });
      } else {
        // Creating new alias
        const desc = transaction.rawDescription || transaction.description;
        setCriteria({
          displayName: "",
          pattern: extractPattern(desc),
          categoryId: transaction.categoryId || "",
        });
      }
      setStep(0);
      setMatchingTransactions([]);
    }
  }, [open, transaction, existingRule]);

  // Search for matching transactions when pattern changes
  const searchMatches = useCallback(async () => {
    if (!criteria.pattern) {
      setMatchingTransactions([]);
      return;
    }

    setIsSearching(true);
    try {
      const matches = await findSimilar(
        { descriptionContains: criteria.pattern },
        transaction?.id
      );
      setMatchingTransactions(matches);
    } catch (error) {
      console.error("Error searching matches:", error);
      setMatchingTransactions([]);
    }
    setIsSearching(false);
  }, [criteria.pattern, findSimilar, transaction?.id]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(searchMatches, 300);
    return () => clearTimeout(timeout);
  }, [open, searchMatches]);

  const updateCriteria = useCallback((updates: Partial<AliasCriteria>) => {
    setCriteria((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = criteria.displayName.trim() && criteria.pattern.trim();
  const totalCount = matchingTransactions.length + 1; // +1 for the current transaction

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return "";
    const category = categories.find((c: LocalCategory) => c.id === categoryId);
    return category?.name || "";
  };

  const handleSave = () => {
    const matchingIds = [transaction.id, ...matchingTransactions.map((t) => t.id)];

    if (isEditing && existingRule && onUpdate) {
      onUpdate(
        existingRule.id,
        {
          displayName: criteria.displayName.trim(),
          descriptionContains: criteria.pattern.trim(),
          categoryId: criteria.categoryId || undefined,
        },
        matchingIds
      );
    } else {
      onSave(
        {
          name: criteria.displayName.trim(),
          displayName: criteria.displayName.trim(),
          descriptionContains: criteria.pattern.trim(),
          categoryId: criteria.categoryId || undefined,
        },
        matchingIds
      );
    }
  };

  const FormContent = ({ variant }: { variant: "mobile" | "desktop" }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-medium">Display as</label>
        <Input
          ref={variant === "desktop" ? displayNameInputRef : undefined}
          id="displayName"
          value={criteria.displayName}
          onChange={(e) => updateCriteria({ displayName: e.target.value })}
          placeholder="e.g., Gym"
          autoFocus={variant === "mobile"}
        />
        <p className="text-xs text-muted-foreground">
          This name will be shown instead of the original description
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="pattern" className="text-sm font-medium">When description contains</label>
        <Input
          id="pattern"
          value={criteria.pattern}
          onChange={(e) => updateCriteria({ pattern: e.target.value })}
          placeholder="e.g., san miguel"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSearching ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span>{totalCount} transaction{totalCount !== 1 ? "s" : ""} match</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">Also set category (optional)</label>
        <Select
          value={criteria.categoryId || "__KEEP_CURRENT__"}
          onValueChange={(value) => updateCriteria({ categoryId: value === "__KEEP_CURRENT__" ? "" : value })}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Keep current category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__KEEP_CURRENT__">Keep current category</SelectItem>
            {categories.map((cat: LocalCategory) => (
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
      </div>
    </div>
  );

  const PreviewContent = ({ variant }: { variant: "mobile" | "desktop" }) => (
    <div className="space-y-3">
      {variant === "desktop" && (
        <h4 className="text-sm font-medium">
          {totalCount} matching transaction{totalCount !== 1 ? "s" : ""}
        </h4>
      )}

      {isSearching ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={`space-y-2 ${variant === "mobile" ? "max-h-[50vh]" : "max-h-64"} overflow-y-auto`}>
          {/* Current transaction */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {criteria.displayName || transaction.description}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  was: {transaction.description}
                </p>
              </div>
              <span className="text-sm tabular-nums shrink-0">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Other matching transactions */}
          {matchingTransactions.map((t) => (
            <div key={t.id} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {criteria.displayName || t.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.date)}
                    {getCategoryName(t.categoryId) && ` · ${getCategoryName(t.categoryId)}`}
                  </p>
                </div>
                <span className="text-sm tabular-nums shrink-0">
                  {formatCurrency(t.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
                <ResponsiveModalTitle>{isEditing ? "Edit Alias" : "Rename Transaction"}</ResponsiveModalTitle>
              </ResponsiveModalHeader>

              <ResponsiveModalBody className="p-4">
                <FormContent variant="mobile" />
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
                <PreviewContent variant="mobile" />
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
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-2xl"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        displayNameInputRef.current?.focus();
      }}
    >
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>{isEditing ? "Edit Alias" : "Rename Transaction"}</ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <div className="grid grid-cols-2 gap-6 p-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">Display as</label>
            <Input
              ref={displayNameInputRef}
              id="displayName"
              value={criteria.displayName}
              onChange={(e) => updateCriteria({ displayName: e.target.value })}
              placeholder="e.g., Gym"
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown instead of the original description
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="pattern" className="text-sm font-medium">When description contains</label>
            <Input
              id="pattern"
              value={criteria.pattern}
              onChange={(e) => updateCriteria({ pattern: e.target.value })}
              placeholder="e.g., san miguel"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSearching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>{totalCount} transaction{totalCount !== 1 ? "s" : ""} match</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">Also set category (optional)</label>
            <Select
              value={criteria.categoryId || "__KEEP_CURRENT__"}
              onValueChange={(value) => updateCriteria({ categoryId: value === "__KEEP_CURRENT__" ? "" : value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Keep current category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__KEEP_CURRENT__">Keep current category</SelectItem>
                {categories.map((cat: LocalCategory) => (
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
          </div>
        </div>

        {/* Preview */}
        <div className="border-l pl-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {totalCount} matching transaction{totalCount !== 1 ? "s" : ""}
            </h4>

            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {criteria.displayName || transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        was: {transaction.description}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums shrink-0">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </div>

                {matchingTransactions.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          {criteria.displayName || t.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.date)}
                          {getCategoryName(t.categoryId) && ` · ${getCategoryName(t.categoryId)}`}
                        </p>
                      </div>
                      <span className="text-sm tabular-nums shrink-0">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-6 border-t mt-4">
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

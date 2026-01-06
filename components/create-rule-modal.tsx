"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalBody,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { useCategories, type LocalTransaction, type LocalCategory } from "@/lib/hooks/db";
import { useRuleForm, RuleFormStep, RulePreviewStep } from "./rule-modal";

export interface CreateRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillTransaction?: LocalTransaction;
  prefillCategoryId?: string;
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

  const {
    step,
    setStep,
    criteria,
    updateCriteria,
    matchingTransactions,
    isSearching,
    canProceed,
    totalCount,
    buildRuleCriteria,
  } = useRuleForm({ open, prefillTransaction, prefillCategoryId });

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return "Unknown";
    const category = categories.find((c: LocalCategory) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const selectedCategoryName = getCategoryName(criteria.categoryId);

  const handleSave = () => {
    const ruleCriteria = buildRuleCriteria();
    const matchingIds = matchingTransactions.map((t) => t.id);
    onSave(ruleCriteria, matchingIds);
  };

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
                  Create Rule{criteria.categoryId && ` for "${selectedCategoryName}"`}
                </ResponsiveModalTitle>
              </ResponsiveModalHeader>

              <ResponsiveModalBody className="p-4">
                <RuleFormStep
                  criteria={criteria}
                  categories={categories}
                  isSearching={isSearching}
                  totalCount={totalCount}
                  selectedCategoryName={selectedCategoryName}
                  variant="mobile"
                  onCriteriaChange={updateCriteria}
                />
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
                <RulePreviewStep
                  matchingTransactions={matchingTransactions}
                  prefillTransaction={prefillTransaction}
                  selectedCategoryName={selectedCategoryName}
                  isSearching={isSearching}
                  totalCount={totalCount}
                  variant="mobile"
                />
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
        <RuleFormStep
          criteria={criteria}
          categories={categories}
          isSearching={isSearching}
          totalCount={totalCount}
          selectedCategoryName={selectedCategoryName}
          variant="desktop"
          onCriteriaChange={updateCriteria}
        />

        {/* Right: Preview */}
        <div className="border-l pl-6">
          <RulePreviewStep
            matchingTransactions={matchingTransactions}
            prefillTransaction={prefillTransaction}
            selectedCategoryName={selectedCategoryName}
            isSearching={isSearching}
            totalCount={totalCount}
            variant="desktop"
          />
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

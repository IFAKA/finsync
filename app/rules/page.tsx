"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateRuleModal } from "@/components/create-rule-modal";
import { useRules, useCategories, useRuleMutations, type LocalRule } from "@/lib/hooks/db";
import { formatCurrency } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

export default function RulesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LocalRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data: rules, isLoading } = useRules();
  const { data: categories } = useCategories();
  const { create: createRule, update: updateRule, remove: deleteRule } = useRuleMutations();

  const openCreateModal = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEditModal = (rule: LocalRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleSaveRule = async (
    criteria: {
      name: string;
      categoryId?: string;
      displayName?: string;
      descriptionContains?: string;
      amountEquals?: number;
      amountMin?: number;
      amountMax?: number;
    },
    _matchingTransactionIds: string[]
  ) => {
    try {
      if (editingRule) {
        await updateRule(editingRule.id, {
          name: criteria.name,
          categoryId: criteria.categoryId,
          displayName: criteria.displayName,
          amountEquals: criteria.amountEquals,
          amountMin: criteria.amountMin,
          amountMax: criteria.amountMax,
          descriptionContains: criteria.descriptionContains,
        });
        toast.success("Rule updated");
      } else {
        await createRule({
          name: criteria.name,
          categoryId: criteria.categoryId,
          displayName: criteria.displayName,
          amountEquals: criteria.amountEquals,
          amountMin: criteria.amountMin,
          amountMax: criteria.amountMax,
          descriptionContains: criteria.descriptionContains,
          priority: rules.length,
          isEnabled: true,
        });
        toast.success("Rule created");
      }
      playSound("complete");
      setModalOpen(false);
    } catch {
      toast.error(editingRule ? "Failed to update rule" : "Failed to create rule");
      playSound("error");
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRule(deleteConfirm.id);
      toast.success("Rule deleted");
      playSound("toggle");
    } catch {
      playSound("error");
    }
    setDeleteConfirm(null);
  };

  const getCategoryInfo = (categoryId?: string) => {
    if (!categoryId) return null;
    const category = categories.find((c) => c.id === categoryId);
    return category ? { name: category.name, color: category.color } : null;
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-3 sm:space-y-6">
      {/* Mobile Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between md:hidden"
      >
        <p className="text-xs text-muted-foreground flex-1">Rules run before AI categorization</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openCreateModal}
          disabled={modalOpen}
          className="h-10 w-10 flex items-center justify-center bg-foreground text-background rounded-lg disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Desktop Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold">Categorization Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rules are applied before AI categorization. Higher priority rules are checked first.
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={modalOpen}>
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </motion.div>

      {/* Rule Modal */}
      <CreateRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingRule={editingRule || undefined}
        onSave={handleSaveRule}
      />

      {/* Rules List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading rules...</CardContent>
        </Card>
      ) : rules.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {rules.map((rule) => {
                const categoryInfo = getCategoryInfo(rule.categoryId);
                return (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 sm:p-4 hover:bg-muted/5 active:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => openEditModal(rule)}
                  >
                    {/* Mobile Layout */}
                    <div className="flex items-start gap-2 md:hidden">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{rule.name}</span>
                          {categoryInfo && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: categoryInfo.color + "20", color: categoryInfo.color }}
                            >
                              {categoryInfo.name}
                            </span>
                          )}
                          {rule.displayName && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              → {rule.displayName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          {rule.amountEquals != null && <span>= {formatCurrency(rule.amountEquals)}</span>}
                          {rule.amountMin != null && <span>&ge; {formatCurrency(rule.amountMin)}</span>}
                          {rule.amountMax != null && <span>&le; {formatCurrency(rule.amountMax)}</span>}
                          {rule.descriptionContains && <span>"{rule.descriptionContains}"</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(rule.id, rule.name); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.name}</span>
                          {categoryInfo && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: categoryInfo.color + "20", color: categoryInfo.color }}
                            >
                              {categoryInfo.name}
                            </span>
                          )}
                          {rule.displayName && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              Shows as: "{rule.displayName}"
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-x-3">
                          {rule.amountEquals != null && <span>Amount = {formatCurrency(rule.amountEquals)}</span>}
                          {rule.amountMin != null && <span>Min: {formatCurrency(rule.amountMin)}</span>}
                          {rule.amountMax != null && <span>Max: {formatCurrency(rule.amountMax)}</span>}
                          {rule.descriptionContains && <span>Contains: "{rule.descriptionContains}"</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(rule.id, rule.name); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <p className="text-muted-foreground mb-2 sm:mb-4 text-sm sm:text-base">
              No rules yet. Create rules to automatically categorize transactions.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Example: "Amount = -395 AND Contains ALQUILER" &rarr; Housing
            </p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Rule"
        description={`Are you sure you want to delete the rule "${deleteConfirm?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

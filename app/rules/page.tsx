"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useRules, useCategories, useRuleMutations } from "@/lib/hooks/use-local-db";
import { formatCurrency } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

export default function RulesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    categoryId: "",
    amountEquals: "",
    amountMin: "",
    amountMax: "",
    descriptionContains: "",
  });

  const { data: rules, isLoading } = useRules();
  const { data: categories } = useCategories();
  const { create: createRule, update: updateRule, remove: deleteRule } = useRuleMutations();

  const handleCreate = async () => {
    if (!newRule.name || !newRule.categoryId) {
      toast.error("Name and category are required");
      return;
    }

    if (!newRule.amountEquals && !newRule.amountMin && !newRule.amountMax && !newRule.descriptionContains) {
      toast.error("At least one condition is required");
      return;
    }

    try {
      await createRule({
        name: newRule.name,
        categoryId: newRule.categoryId,
        amountEquals: newRule.amountEquals ? parseFloat(newRule.amountEquals) : undefined,
        amountMin: newRule.amountMin ? parseFloat(newRule.amountMin) : undefined,
        amountMax: newRule.amountMax ? parseFloat(newRule.amountMax) : undefined,
        descriptionContains: newRule.descriptionContains || undefined,
        priority: rules.length,
        isEnabled: true,
      });
      toast.success("Rule created");
      playSound("complete");
      setIsCreating(false);
      setNewRule({ name: "", categoryId: "", amountEquals: "", amountMin: "", amountMax: "", descriptionContains: "" });
    } catch {
      toast.error("Failed to create rule");
      playSound("error");
    }
  };

  const toggleEnabled = async (id: string, currentlyEnabled: boolean) => {
    try {
      await updateRule(id, { isEnabled: !currentlyEnabled });
      toast.success("Rule updated");
      playSound("toggle");
    } catch {
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
    if (!categoryId) return { name: "Unknown", color: "#888" };
    const category = categories.find((c) => c.id === categoryId);
    return category ? { name: category.name, color: category.color } : { name: "Unknown", color: "#888" };
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
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
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
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </motion.div>

      {/* Mobile Drawer */}
      <Drawer open={isCreating} onOpenChange={setIsCreating}>
        <DrawerContent className="sm:hidden">
          <DrawerHeader>
            <DrawerTitle>New Rule</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Rule Name</label>
              <Input
                placeholder="e.g., Monthly Rent"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <select
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                value={newRule.categoryId}
                onChange={(e) => setNewRule({ ...newRule, categoryId: e.target.value })}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium mb-2">Conditions (at least one)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Exact Amount</label>
                  <Input type="number" step="0.01" placeholder="-395" value={newRule.amountEquals} onChange={(e) => setNewRule({ ...newRule, amountEquals: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contains</label>
                  <Input placeholder="ALQUILER" value={newRule.descriptionContains} onChange={(e) => setNewRule({ ...newRule, descriptionContains: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Min</label>
                  <Input type="number" step="0.01" placeholder="-500" value={newRule.amountMin} onChange={(e) => setNewRule({ ...newRule, amountMin: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Max</label>
                  <Input type="number" step="0.01" placeholder="-300" value={newRule.amountMax} onChange={(e) => setNewRule({ ...newRule, amountMax: e.target.value })} className="h-10" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Desktop Form */}
      {isCreating && (
        <Card className="hidden sm:block">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">New Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rule Name</label>
                <Input placeholder="e.g., Monthly Rent" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <select
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                  value={newRule.categoryId}
                  onChange={(e) => setNewRule({ ...newRule, categoryId: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Conditions (at least one)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Exact Amount</label>
                  <Input type="number" step="0.01" placeholder="-395" value={newRule.amountEquals} onChange={(e) => setNewRule({ ...newRule, amountEquals: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contains</label>
                  <Input placeholder="ALQUILER" value={newRule.descriptionContains} onChange={(e) => setNewRule({ ...newRule, descriptionContains: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Min</label>
                  <Input type="number" step="0.01" placeholder="-500" value={newRule.amountMin} onChange={(e) => setNewRule({ ...newRule, amountMin: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Max</label>
                  <Input type="number" step="0.01" placeholder="-300" value={newRule.amountMax} onChange={(e) => setNewRule({ ...newRule, amountMax: e.target.value })} className="h-9" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    className={`p-3 sm:p-4 ${!rule.isEnabled ? "opacity-50" : ""}`}
                  >
                    {/* Mobile Layout */}
                    <div className="flex items-start gap-2 md:hidden">
                      <button
                        onClick={() => toggleEnabled(rule.id, rule.isEnabled)}
                        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md transition-colors shrink-0 mt-0.5"
                      >
                        {rule.isEnabled ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{rule.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: categoryInfo.color + "20", color: categoryInfo.color }}
                          >
                            {categoryInfo.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          {rule.amountEquals !== undefined && <span>= {formatCurrency(rule.amountEquals)}</span>}
                          {rule.amountMin !== undefined && <span>&ge; {formatCurrency(rule.amountMin)}</span>}
                          {rule.amountMax !== undefined && <span>&le; {formatCurrency(rule.amountMax)}</span>}
                          {rule.descriptionContains && <span>"{rule.descriptionContains}"</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-error" onClick={() => handleDeleteClick(rule.id, rule.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleEnabled(rule.id, rule.isEnabled)}
                          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        >
                          {rule.isEnabled ? <ToggleRight className="w-6 h-6 text-success" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: categoryInfo.color + "20", color: categoryInfo.color }}
                            >
                              {categoryInfo.name}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-x-3">
                            {rule.amountEquals !== undefined && <span>Amount = {formatCurrency(rule.amountEquals)}</span>}
                            {rule.amountMin !== undefined && <span>Min: {formatCurrency(rule.amountMin)}</span>}
                            {rule.amountMax !== undefined && <span>Max: {formatCurrency(rule.amountMax)}</span>}
                            {rule.descriptionContains && <span>Contains: "{rule.descriptionContains}"</span>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-error" onClick={() => handleDeleteClick(rule.id, rule.name)}>
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

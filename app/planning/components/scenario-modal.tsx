"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalBody,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import {
  useScenarioMutations,
  useCategories,
  useRecurringPatterns,
  type LocalScenario,
  type ScenarioModification,
} from "@/lib/hooks/db";
import { playSound } from "@/lib/sounds";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario?: LocalScenario;
  baseMonth: string;
}

type ModificationType = 'add_expense' | 'remove_expense' | 'add_income' | 'adjust_budget';

const MODIFICATION_TYPES: { value: ModificationType; label: string; icon: typeof TrendingUp; color: string }[] = [
  { value: 'add_expense', label: 'Add Expense', icon: TrendingDown, color: 'text-destructive' },
  { value: 'remove_expense', label: 'Reduce Expense', icon: TrendingUp, color: 'text-success' },
  { value: 'add_income', label: 'Add Income', icon: TrendingUp, color: 'text-success' },
  { value: 'adjust_budget', label: 'Adjust Budget', icon: Percent, color: 'text-primary' },
];

export function ScenarioModal({ open, onOpenChange, scenario, baseMonth }: ScenarioModalProps) {
  const [name, setName] = useState("");
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [modifications, setModifications] = useState<ScenarioModification[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useCategories();
  const { data: recurringPatterns } = useRecurringPatterns({ isActive: true });
  const { create, update } = useScenarioMutations();

  const isEditing = !!scenario;

  useEffect(() => {
    if (open) {
      if (scenario) {
        setName(scenario.name);
        setProjectionMonths(scenario.projectionMonths);
        setModifications(scenario.modifications);
      } else {
        setName("");
        setProjectionMonths(12);
        setModifications([]);
      }
    }
  }, [open, scenario]);

  const addModification = () => {
    const newMod: ScenarioModification = {
      id: crypto.randomUUID(),
      type: 'add_expense',
      amount: 0,
    };
    setModifications([...modifications, newMod]);
  };

  const updateModification = (id: string, updates: Partial<ScenarioModification>) => {
    setModifications(modifications.map(m =>
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const removeModification = (id: string) => {
    setModifications(modifications.filter(m => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }

    if (modifications.length === 0) {
      toast.error("Please add at least one modification");
      return;
    }

    // Validate all modifications have amounts
    for (const mod of modifications) {
      if (!mod.amount || mod.amount <= 0) {
        toast.error("Please enter valid amounts for all modifications");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const data = {
        name: name.trim(),
        baseMonth,
        modifications,
        projectionMonths,
      };

      if (isEditing) {
        await update(scenario.id, data);
        toast.success("Scenario updated");
      } else {
        await create(data);
        toast.success("Scenario created");
      }

      playSound("complete");
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update scenario" : "Failed to create scenario");
      playSound("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>
          {isEditing ? "Edit Scenario" : "Create What-If Scenario"}
        </ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="px-4 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="scenario-name" className="text-sm font-medium mb-1.5 block">Scenario Name</label>
          <Input
            id="scenario-name"
            placeholder="e.g., Cancel Netflix, Side Hustle Income"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Projection Period */}
        <fieldset>
          <legend className="text-sm font-medium mb-2 block">Projection Period</legend>
          <div className="flex gap-2" role="group" aria-label="Projection period">
            {[6, 12, 24].map(months => (
              <button
                key={months}
                type="button"
                aria-pressed={projectionMonths === months}
                onClick={() => setProjectionMonths(months)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                  projectionMonths === months
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                )}
              >
                {months} months
              </button>
            ))}
          </div>
        </fieldset>

        {/* Modifications */}
        <div>
          <p className="text-sm font-medium mb-2">Changes</p>
          <div className="space-y-3">
            {modifications.map(mod => (
              <ModificationRow
                key={mod.id}
                modification={mod}
                categories={categories}
                recurringPatterns={recurringPatterns}
                onUpdate={(updates) => updateModification(mod.id, updates)}
                onRemove={() => removeModification(mod.id)}
              />
            ))}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={addModification}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Change
            </Button>
          </div>
        </div>

        {/* Summary */}
        {modifications.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Monthly impact:{' '}
              <span className={cn(
                "font-medium",
                calculateMonthlyImpact(modifications) >= 0 ? "text-success" : "text-destructive"
              )}>
                {calculateMonthlyImpact(modifications) >= 0 ? '+' : ''}
                {formatCurrency(calculateMonthlyImpact(modifications))}
              </span>
            </p>
          </div>
        )}
      </ResponsiveModalBody>

      <ResponsiveModalFooter className="px-4 pb-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Scenario"}
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}

interface ModificationRowProps {
  modification: ScenarioModification;
  categories: Array<{ id: string; name: string }>;
  recurringPatterns: Array<{ id: string; name: string; amount: number }>;
  onUpdate: (updates: Partial<ScenarioModification>) => void;
  onRemove: () => void;
}

function ModificationRow({ modification, categories, recurringPatterns, onUpdate, onRemove }: ModificationRowProps) {

  return (
    <div className="p-3 rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <select
          value={modification.type}
          onChange={(e) => onUpdate({ type: e.target.value as ModificationType })}
          className="h-9 px-2 rounded-lg border border-border bg-background text-sm"
          aria-label="Modification type"
        >
          {MODIFICATION_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 p-2 text-muted-foreground hover:text-destructive"
          aria-label="Delete modification"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            aria-label="Amount"
            value={modification.amount || ''}
            onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
            min={0}
            step={10}
          />
        </div>

        {modification.type === 'adjust_budget' && (
          <select
            value={modification.categoryId || ''}
            onChange={(e) => onUpdate({ categoryId: e.target.value })}
            className="flex-1 h-11 px-3 rounded-lg border border-border bg-background text-sm"
            aria-label="Category"
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}

        {modification.type === 'remove_expense' && recurringPatterns.length > 0 && (
          <select
            value={modification.recurringPatternId || ''}
            onChange={(e) => {
              const pattern = recurringPatterns.find(p => p.id === e.target.value);
              onUpdate({
                recurringPatternId: e.target.value || undefined,
                amount: pattern?.amount || modification.amount,
              });
            }}
            className="flex-1 h-11 px-3 rounded-lg border border-border bg-background text-sm"
            aria-label="Recurring expense"
          >
            <option value="">Custom amount</option>
            {recurringPatterns
              .filter(p => p.amount > 0)
              .map(pattern => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name} ({formatCurrency(pattern.amount)})
                </option>
              ))}
          </select>
        )}
      </div>

      {modification.description !== undefined && (
        <Input
          placeholder="Description (optional)"
          value={modification.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
        />
      )}
    </div>
  );
}

function calculateMonthlyImpact(modifications: ScenarioModification[]): number {
  return modifications.reduce((total, mod) => {
    const amount = mod.amount || 0;
    switch (mod.type) {
      case 'add_income':
      case 'remove_expense':
        return total + amount;
      case 'add_expense':
        return total - amount;
      case 'adjust_budget':
        // Budget adjustments have complex impact, simplified here
        return total;
      default:
        return total;
    }
  }, 0);
}

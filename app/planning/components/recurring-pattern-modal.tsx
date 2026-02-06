"use client";

import { useState, useEffect } from "react";
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
import { useRecurringPatternMutations, useCategories, type LocalRecurringPattern, type RecurringFrequency } from "@/lib/hooks/db";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface RecurringPatternModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pattern?: LocalRecurringPattern;
}

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function RecurringPatternModal({ open, onOpenChange, pattern }: RecurringPatternModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [categoryId, setCategoryId] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useCategories();
  const { create, update } = useRecurringPatternMutations();

  const isEditing = !!pattern;

  useEffect(() => {
    if (open) {
      if (pattern) {
        setName(pattern.name);
        setType(pattern.type);
        setAmount(pattern.amount.toString());
        setFrequency(pattern.frequency);
        setCategoryId(pattern.categoryId || "");
        setNextDate(pattern.nextDate ? formatDateForInput(pattern.nextDate) : "");
      } else {
        setName("");
        setType('expense');
        setAmount("");
        setFrequency('monthly');
        setCategoryId("");
        setNextDate("");
      }
    }
  }, [open, pattern]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        name: name.trim(),
        type,
        amount: parsedAmount,
        frequency,
        categoryId: categoryId || undefined,
        nextDate: nextDate ? new Date(nextDate) : undefined,
        isActive: true,
        confidence: 1, // Manual patterns have 100% confidence
        source: 'manual' as const,
      };

      if (isEditing) {
        await update(pattern.id, data);
        toast.success("Pattern updated");
      } else {
        await create(data);
        toast.success("Pattern added");
      }

      playSound("complete");
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update pattern" : "Failed to add pattern");
      playSound("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>
          {isEditing ? "Edit Recurring Transaction" : "Add Recurring Transaction"}
        </ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="px-4 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="pattern-name" className="text-sm font-medium mb-1.5 block">Name</label>
          <Input
            id="pattern-name"
            placeholder="e.g., Netflix, Rent, Salary"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Type */}
        <fieldset>
          <legend className="text-sm font-medium mb-2 block">Type</legend>
          <div className="flex gap-2" role="group" aria-label="Transaction type">
            <button
              type="button"
              aria-pressed={type === 'expense'}
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                type === 'expense'
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              Expense
            </button>
            <button
              type="button"
              aria-pressed={type === 'income'}
              onClick={() => setType('income')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                type === 'income'
                  ? "bg-success text-success-foreground border-success"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              Income
            </button>
          </div>
        </fieldset>

        {/* Amount */}
        <div>
          <label htmlFor="pattern-amount" className="text-sm font-medium mb-1.5 block">Amount</label>
          <Input
            id="pattern-amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step={0.01}
          />
        </div>

        {/* Frequency */}
        <fieldset>
          <legend className="text-sm font-medium mb-2 block">Frequency</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Recurring frequency">
            {FREQUENCIES.map(f => (
              <button
                key={f.value}
                type="button"
                aria-pressed={frequency === f.value}
                onClick={() => setFrequency(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  frequency === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Category */}
        <div>
          <label htmlFor="pattern-category" className="text-sm font-medium mb-1.5 block">Category (optional)</label>
          <select
            id="pattern-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">No category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Next Date */}
        <div>
          <label htmlFor="pattern-next-date" className="text-sm font-medium mb-1.5 block">Next occurrence (optional)</label>
          <Input
            id="pattern-next-date"
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </div>
      </ResponsiveModalBody>

      <ResponsiveModalFooter className="px-4 pb-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Pattern"}
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}

function formatDateForInput(date: Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

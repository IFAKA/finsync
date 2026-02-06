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
import {
  useSavingsGoalById,
  useSavingsGoalMutations,
  useGoalContributionMutations,
} from "@/lib/hooks/db";
import { playSound } from "@/lib/sounds";
import { formatCurrency } from "@/lib/utils";

interface ContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId?: string;
}

export function ContributionModal({ open, onOpenChange, goalId }: ContributionModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: goal } = useSavingsGoalById(goalId);
  const { update: updateGoal } = useSavingsGoalMutations();
  const { create: createContribution } = useGoalContributionMutations();

  useEffect(() => {
    if (open) {
      setAmount("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!goalId || !goal) return;

    const contributionAmount = parseFloat(amount);
    if (isNaN(contributionAmount) || contributionAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create contribution record
      await createContribution({
        goalId,
        amount: contributionAmount,
        date: new Date(),
      });

      // Update goal's current amount
      await updateGoal(goalId, {
        currentAmount: goal.currentAmount + contributionAmount,
      });

      toast.success(`Added ${formatCurrency(contributionAmount)} to ${goal.name}`);
      playSound("complete");
      onOpenChange(false);
    } catch {
      toast.error("Failed to add contribution");
      playSound("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remaining = goal ? goal.targetAmount - goal.currentAmount : 0;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Add Funds</ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="px-4 space-y-4">
        {goal && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium">{goal.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)} saved
            </p>
            {remaining > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(remaining)} remaining
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="contributionAmount" className="text-sm font-medium mb-1.5 block">Amount</label>
          <Input
            id="contributionAmount"
            type="number"
            inputMode="decimal"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step={10}
            autoFocus
          />
        </div>

        {/* Quick amount buttons */}
        <div className="flex gap-2">
          {[50, 100, 250, 500].map(quickAmount => (
            <Button
              key={quickAmount}
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setAmount(quickAmount.toString())}
            >
              {formatCurrency(quickAmount)}
            </Button>
          ))}
        </div>

        {remaining > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => setAmount(remaining.toString())}
          >
            Complete goal ({formatCurrency(remaining)})
          </Button>
        )}
      </ResponsiveModalBody>

      <ResponsiveModalFooter className="px-4 pb-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
          {isSubmitting ? "Adding..." : "Add Funds"}
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}

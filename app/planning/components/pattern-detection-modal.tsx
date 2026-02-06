"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalBody,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import { useRecurringPatternMutations } from "@/lib/hooks/db";
import { playSound } from "@/lib/sounds";
import { formatCurrency } from "@/lib/utils";
import { type DetectedPattern } from "@/lib/planning";

interface PatternDetectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patterns: DetectedPattern[];
}

export function PatternDetectionModal({ open, onOpenChange, patterns }: PatternDetectionModalProps) {
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { create } = useRecurringPatternMutations();

  const togglePattern = (pattern: DetectedPattern) => {
    const key = pattern.descriptionPattern;
    const newSelected = new Set(selectedPatterns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedPatterns(newSelected);
  };

  const handleConfirm = async () => {
    const patternsToAdd = patterns.filter(p => selectedPatterns.has(p.descriptionPattern));
    if (patternsToAdd.length === 0) {
      toast.error("Please select at least one pattern");
      return;
    }

    setIsSubmitting(true);

    try {
      for (const pattern of patternsToAdd) {
        await create({
          name: pattern.name,
          type: pattern.type,
          amount: pattern.amount,
          frequency: pattern.frequency,
          categoryId: pattern.categoryId,
          descriptionPattern: pattern.descriptionPattern,
          nextDate: pattern.nextDate,
          lastDate: pattern.lastDate,
          isActive: true,
          confidence: pattern.confidence,
          source: 'detected',
        });
      }

      toast.success(`Added ${patternsToAdd.length} recurring ${patternsToAdd.length === 1 ? 'pattern' : 'patterns'}`);
      playSound("complete");
      setSelectedPatterns(new Set());
      onOpenChange(false);
    } catch {
      toast.error("Failed to add patterns");
      playSound("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Review Detected Patterns</ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="px-4">
        <p className="text-sm text-muted-foreground mb-4">
          We found {patterns.length} recurring transactions in your history.
          Select the ones you want to track for forecasting.
        </p>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {patterns.map(pattern => {
            const isSelected = selectedPatterns.has(pattern.descriptionPattern);
            return (
              <button
                key={pattern.descriptionPattern}
                onClick={() => togglePattern(pattern)}
                aria-pressed={isSelected}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    pattern.type === 'income' ? 'bg-success/20' : 'bg-destructive/20'
                  }`}>
                    {pattern.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{pattern.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{frequencyLabels[pattern.frequency]}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{pattern.matchingTransactions.length} occurrences</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{Math.round(pattern.confidence * 100)}% confidence</span>
                    </div>
                  </div>

                  <p className={`font-medium tabular-nums text-sm shrink-0 ${
                    pattern.type === 'income' ? 'text-success' : 'text-destructive'
                  }`}>
                    {pattern.type === 'income' ? '+' : '-'}{formatCurrency(pattern.amount)}
                  </p>

                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {patterns.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No new patterns detected
          </div>
        )}
      </ResponsiveModalBody>

      <ResponsiveModalFooter className="px-4 pb-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting || selectedPatterns.size === 0}
        >
          {isSubmitting ? "Adding..." : `Add ${selectedPatterns.size} Pattern${selectedPatterns.size !== 1 ? 's' : ''}`}
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}

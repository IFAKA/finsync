"use client";

import { useState, useEffect } from "react";
import { Target, PiggyBank, Home, Car, Plane, Gift, Briefcase, GraduationCap, Heart, Umbrella, Star, Check } from "lucide-react";
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
import { useSavingsGoalMutations, useCategories, type LocalSavingsGoal } from "@/lib/hooks/db";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: LocalSavingsGoal;
  colors: string[];
  icons: string[];
}

const ICON_MAP: Record<string, typeof Target> = {
  "piggy-bank": PiggyBank,
  "home": Home,
  "car": Car,
  "plane": Plane,
  "gift": Gift,
  "briefcase": Briefcase,
  "graduation-cap": GraduationCap,
  "heart": Heart,
  "umbrella": Umbrella,
  "star": Star,
};

export function GoalModal({ open, onOpenChange, goal, colors, icons }: GoalModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedIcon, setSelectedIcon] = useState(icons[0]);
  const [trackingMode, setTrackingMode] = useState<'manual' | 'auto'>('manual');
  const [categoryId, setCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useCategories();
  const { create, update } = useSavingsGoalMutations();

  const isEditing = !!goal;

  useEffect(() => {
    if (open) {
      if (goal) {
        setName(goal.name);
        setTargetAmount(goal.targetAmount.toString());
        setCurrentAmount(goal.currentAmount.toString());
        setTargetDate(goal.targetDate ? formatDateForInput(goal.targetDate) : "");
        setSelectedColor(goal.color);
        setSelectedIcon(goal.icon || icons[0]);
        setTrackingMode(goal.trackingMode);
        setCategoryId(goal.categoryId || "");
      } else {
        setName("");
        setTargetAmount("");
        setCurrentAmount("0");
        setTargetDate("");
        setSelectedColor(colors[0]);
        setSelectedIcon(icons[0]);
        setTrackingMode('manual');
        setCategoryId("");
      }
    }
  }, [open, goal, colors, icons]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a goal name");
      return;
    }

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    const current = parseFloat(currentAmount) || 0;

    setIsSubmitting(true);

    try {
      const goalData = {
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        color: selectedColor,
        icon: selectedIcon,
        trackingMode,
        categoryId: trackingMode === 'auto' ? categoryId : undefined,
      };

      if (isEditing) {
        await update(goal.id, goalData);
        toast.success("Goal updated");
      } else {
        await create(goalData);
        toast.success("Goal created");
      }

      playSound("complete");
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update goal" : "Failed to create goal");
      playSound("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>
          {isEditing ? "Edit Goal" : "Create Savings Goal"}
        </ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="px-4 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="goalName" className="text-sm font-medium mb-1.5 block">Goal Name</label>
          <Input
            id="goalName"
            placeholder="e.g., Emergency Fund, Vacation, New Car"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Target Amount */}
        <div>
          <label htmlFor="goalTarget" className="text-sm font-medium mb-1.5 block">Target Amount</label>
          <Input
            id="goalTarget"
            type="number"
            inputMode="decimal"
            placeholder="10000"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            min={0}
            step={100}
          />
        </div>

        {/* Current Amount */}
        <div>
          <label htmlFor="goalCurrent" className="text-sm font-medium mb-1.5 block">Current Amount</label>
          <Input
            id="goalCurrent"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            min={0}
            step={100}
          />
        </div>

        {/* Target Date */}
        <div>
          <label htmlFor="goalDeadline" className="text-sm font-medium mb-1.5 block">Target Date (optional)</label>
          <Input
            id="goalDeadline"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Tracking Mode */}
        <fieldset>
          <legend className="text-sm font-medium mb-2 block">Tracking Mode</legend>
          <div className="flex gap-2" role="group" aria-label="Tracking mode">
            <button
              type="button"
              aria-pressed={trackingMode === 'manual'}
              onClick={() => setTrackingMode('manual')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                trackingMode === 'manual'
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              Manual
            </button>
            <button
              type="button"
              aria-pressed={trackingMode === 'auto'}
              onClick={() => setTrackingMode('auto')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                trackingMode === 'auto'
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              Auto-track
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {trackingMode === 'manual'
              ? "Manually add contributions as you save"
              : "Automatically track from a category (e.g., transfers to savings)"}
          </p>
        </fieldset>

        {/* Category selector for auto-track */}
        {trackingMode === 'auto' && (
          <div>
            <label htmlFor="goalCategory" className="text-sm font-medium mb-1.5 block">Track Category</label>
            <select
              id="goalCategory"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Color Picker */}
        <div>
          <label className="text-sm font-medium mb-2 block">Color</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-label={`Select ${color} color`}
                className={cn(
                  "w-8 h-8 rounded-full transition-colors flex items-center justify-center",
                  selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                )}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="text-sm font-medium mb-2 block">Icon</label>
          <div className="flex flex-wrap gap-2">
            {icons.map(iconName => {
              const Icon = ICON_MAP[iconName] || Target;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  aria-label={`Select ${iconName} icon`}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                    selectedIcon === iconName
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      </ResponsiveModalBody>

      <ResponsiveModalFooter className="px-4 pb-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Goal"}
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}

function formatDateForInput(date: Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

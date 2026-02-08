"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Calendar, Pencil, Trash2, PiggyBank, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useSavingsGoals,
  useSavingsGoalMutations,
  useGoalContributions,
  useTransactions,
  useRecurringPatterns,
  useBudgets,
} from "@/lib/hooks/db";
import { formatCurrency } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import {
  calculateGoalProgress,
  sortGoalsByPriority,
  generateForecast,
  type GoalProgress,
} from "@/lib/planning";
import { GoalModal } from "./goal-modal";
import { ContributionModal } from "./contribution-modal";

const GOAL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#a855f7", "#10b981",
];

const GOAL_ICONS = [
  "piggy-bank", "home", "car", "plane", "gift",
  "briefcase", "graduation-cap", "heart", "umbrella", "star",
];

export function GoalsTab() {
  const [goalModal, setGoalModal] = useState<{ open: boolean; goal?: typeof goals[0] }>({ open: false });
  const [contributionModal, setContributionModal] = useState<{ open: boolean; goalId?: string }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ goalId: string; goalName: string } | null>(null);

  const { data: goals, isLoading } = useSavingsGoals();
  const { data: contributions } = useGoalContributions();
  const { data: transactions } = useTransactions();
  const { data: recurringPatterns } = useRecurringPatterns({ isActive: true });
  const { data: budgets } = useBudgets();
  const { remove: deleteGoal } = useSavingsGoalMutations();

  // Generate forecasts for goal progress calculation
  const forecasts = useMemo(() => {
    const now = new Date();
    const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return generateForecast({
      startMonth,
      months: 24,
      recurringPatterns,
      historicalTransactions: transactions,
      budgets,
    });
  }, [recurringPatterns, transactions, budgets]);

  // Calculate progress for all goals
  const goalProgressList = useMemo(() => {
    const progressList: GoalProgress[] = goals.map(goal => {
      const goalContributions = contributions.filter(c => c.goalId === goal.id);
      return calculateGoalProgress(goal, goalContributions, forecasts);
    });
    return sortGoalsByPriority(progressList);
  }, [goals, contributions, forecasts]);

  const handleDeleteGoal = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteGoal(deleteConfirm.goalId);
      toast.success("Goal deleted");
      playSound("toggle");
    } catch {
      toast.error("Failed to delete goal");
      playSound("error");
    }
    setDeleteConfirm(null);
  };

  const totalSaved = goalProgressList.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalTarget = goalProgressList.reduce((sum, p) => sum + p.targetAmount, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-border rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-border rounded" />
                  <div className="h-2 w-full bg-border rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {goals.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalSaved)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="text-lg font-medium tabular-nums text-muted-foreground">
                  {formatCurrency(totalTarget)}
                </p>
              </div>
            </div>
            <Progress
              value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}
              className="h-2"
              indicatorClassName="bg-success"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {totalTarget > 0
                ? `${Math.round((totalSaved / totalTarget) * 100)}% of total goals`
                : "Set your first savings goal"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {goalProgressList.map(progress => (
            <GoalCard
              key={progress.goal.id}
              progress={progress}
              onEdit={() => setGoalModal({ open: true, goal: progress.goal })}
              onDelete={() => setDeleteConfirm({ goalId: progress.goal.id, goalName: progress.goal.name })}
              onAddContribution={() => setContributionModal({ open: true, goalId: progress.goal.id })}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {goals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No savings goals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first goal to start tracking your savings progress
            </p>
            <Button onClick={() => setGoalModal({ open: true })}>
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Goal Button */}
      {goals.length > 0 && (
        <Button
          onClick={() => setGoalModal({ open: true })}
          className="w-full"
          variant="secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Savings Goal
        </Button>
      )}

      {/* Modals */}
      <GoalModal
        open={goalModal.open}
        onOpenChange={(open) => setGoalModal({ open })}
        goal={goalModal.goal}
        colors={GOAL_COLORS}
        icons={GOAL_ICONS}
      />

      <ContributionModal
        open={contributionModal.open}
        onOpenChange={(open) => setContributionModal({ open })}
        goalId={contributionModal.goalId}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Goal"
        description={`Are you sure you want to delete "${deleteConfirm?.goalName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}

interface GoalCardProps {
  progress: GoalProgress;
  onEdit: () => void;
  onDelete: () => void;
  onAddContribution: () => void;
}

function GoalCard({ progress, onEdit, onDelete, onAddContribution }: GoalCardProps) {
  const { goal, percentComplete, remainingAmount, status, daysRemaining, estimatedCompletionDate } = progress;

  const statusColors = {
    completed: "text-success",
    on_track: "text-success",
    ahead: "text-success",
    behind: "text-warning",
    no_deadline: "text-muted-foreground",
  };

  const statusLabels = {
    completed: "Completed!",
    on_track: "On track",
    ahead: "Ahead of schedule",
    behind: "Behind schedule",
    no_deadline: "No deadline",
  };

  const IconComponent = goal.icon === 'piggy-bank' ? PiggyBank : Target;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Progress bar at top */}
          <div className="h-1" style={{ backgroundColor: `${goal.color}20` }}>
            <motion.div
              className="h-full"
              style={{ backgroundColor: goal.color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentComplete, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${goal.color}20` }}
              >
                <IconComponent className="w-5 h-5" style={{ color: goal.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium truncate">{goal.name}</h3>
                  <span className={`text-xs font-medium ${statusColors[status]}`}>
                    {statusLabels[status]}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(goal.currentAmount)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatCurrency(goal.targetAmount)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {Math.round(percentComplete)}%
                  </span>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {daysRemaining !== null && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {daysRemaining === 0 ? "Due today" : `${daysRemaining} days left`}
                    </span>
                  )}
                  {estimatedCompletionDate && status !== 'completed' && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Est. {formatMonth(estimatedCompletionDate)}
                    </span>
                  )}
                  {remainingAmount > 0 && (
                    <span>{formatCurrency(remainingAmount)} to go</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t">
              {goal.trackingMode === 'manual' && status !== 'completed' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={onAddContribution}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Funds
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${goal.name}`}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                aria-label={`Delete ${goal.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

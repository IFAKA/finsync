"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Plus, Trash2, TrendingUp, TrendingDown, Target, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useScenarios,
  useScenarioMutations,
  useTransactions,
  useRecurringPatterns,
  useBudgets,
  useSavingsGoals,
} from "@/lib/hooks/db";
import { formatCurrency } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import {
  runSimulation,
  suggestScenarios,
  type SimulationResult,
} from "@/lib/planning";
import { ScenarioModal } from "./scenario-modal";

export function WhatIfTab() {
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data: scenarios } = useScenarios();
  const { remove: deleteScenario } = useScenarioMutations();
  const { data: transactions } = useTransactions();
  const { data: recurringPatterns } = useRecurringPatterns({ isActive: true });
  const { data: budgets } = useBudgets();
  const { data: goals } = useSavingsGoals();

  // Current month for simulations
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Get suggested scenarios
  const suggestions = useMemo(() => {
    return suggestScenarios(goals, recurringPatterns, currentMonth);
  }, [goals, recurringPatterns, currentMonth]);

  // Run selected scenario simulation
  const simulationResult = useMemo(() => {
    const scenario = scenarios.find(s => s.id === selectedScenarioId);
    if (!scenario) return null;

    return runSimulation(
      scenario,
      recurringPatterns,
      transactions,
      budgets,
      goals
    );
  }, [selectedScenarioId, scenarios, recurringPatterns, transactions, budgets, goals]);

  const handleDeleteScenario = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteScenario(deleteConfirm.id);
      if (selectedScenarioId === deleteConfirm.id) {
        setSelectedScenarioId(null);
      }
      toast.success("Scenario deleted");
      playSound("toggle");
    } catch {
      toast.error("Failed to delete scenario");
      playSound("error");
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      {/* Intro Card */}
      {scenarios.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-medium mb-2">What-If Scenarios</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Test how changes to your income or expenses would affect your savings and goals
            </p>
            <Button onClick={() => setShowScenarioModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Scenario
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Suggestions */}
      {scenarios.length === 0 && suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Quick Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {suggestions.slice(0, 4).map((suggestion, idx) => (
                <QuickScenarioRow
                  key={idx}
                  suggestion={suggestion}
                  onSelect={async () => {
                    // This would normally create the scenario
                    setShowScenarioModal(true);
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario List */}
      {scenarios.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {scenarios.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isSelected={selectedScenarioId === scenario.id}
              onSelect={() => setSelectedScenarioId(scenario.id)}
              onDelete={() => setDeleteConfirm({ id: scenario.id, name: scenario.name })}
            />
          ))}
          <Card
            className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
            role="button"
            tabIndex={0}
            aria-label="Create new scenario"
            onClick={() => setShowScenarioModal(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowScenarioModal(true);
              }
            }}
          >
            <CardContent className="p-4 flex items-center justify-center h-full min-h-[100px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Plus className="w-5 h-5" />
                <span>New Scenario</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simulation Results */}
      {simulationResult && (
        <SimulationResultsCard result={simulationResult} />
      )}

      {/* Modals */}
      <ScenarioModal
        open={showScenarioModal}
        onOpenChange={setShowScenarioModal}
        baseMonth={currentMonth}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Scenario"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteScenario}
      />
    </div>
  );
}

interface QuickScenarioRowProps {
  suggestion: {
    name: string;
    modifications: Array<{ type: string; amount?: number }>;
  };
  onSelect: () => void;
}

function QuickScenarioRow({ suggestion, onSelect }: QuickScenarioRowProps) {
  const mod = suggestion.modifications[0];
  const isPositive = mod?.type === 'add_income' || mod?.type === 'remove_expense';

  return (
    <button
      onClick={onSelect}
      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isPositive ? 'bg-success/20' : 'bg-muted'
      }`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-success" />
        ) : (
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{suggestion.name}</p>
      </div>
      <Plus className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

interface ScenarioCardProps {
  scenario: {
    id: string;
    name: string;
    projectionMonths: number;
    modifications: Array<{ type: string; amount?: number }>;
  };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ScenarioCard({ scenario, isSelected, onSelect, onDelete }: ScenarioCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
      }`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-sm truncate">{scenario.name}</h3>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 -mt-1 -mr-1 text-muted-foreground hover:text-destructive"
            aria-label="Delete scenario"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{scenario.modifications.length} change{scenario.modifications.length !== 1 ? 's' : ''}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{scenario.projectionMonths} month projection</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface SimulationResultsCardProps {
  result: SimulationResult;
}

function SimulationResultsCard({ result }: SimulationResultsCardProps) {
  const { comparison, goalImpacts } = result;

  const isPositive = comparison.totalSavingsDelta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Simulation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Impact Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Total Savings Impact</p>
              <p className={`text-lg font-semibold tabular-nums ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{formatCurrency(comparison.totalSavingsDelta)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Monthly Change</p>
              <p className={`text-lg font-semibold tabular-nums ${comparison.avgMonthlySavingsDelta >= 0 ? 'text-success' : 'text-destructive'}`}>
                {comparison.avgMonthlySavingsDelta >= 0 ? '+' : ''}{formatCurrency(comparison.avgMonthlySavingsDelta)}/mo
              </p>
            </div>
          </div>

          {/* Savings Rate Change */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm">Savings Rate</span>
              <span className={`font-medium ${comparison.savingsRateDelta >= 0 ? 'text-success' : 'text-destructive'}`}>
                {comparison.savingsRateDelta >= 0 ? '+' : ''}{comparison.savingsRateDelta.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Goal Impacts */}
          {goalImpacts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Goal Impact
              </h4>
              <div className="space-y-2">
                {goalImpacts.map(impact => (
                  <div key={impact.goal.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{impact.goal.name}</span>
                      {impact.isImproved ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : impact.monthsDelta !== null ? (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {impact.monthsDelta !== null ? (
                        impact.monthsDelta > 0 ? (
                          <span className="text-success">Reach goal {impact.monthsDelta} month{impact.monthsDelta !== 1 ? 's' : ''} faster</span>
                        ) : impact.monthsDelta < 0 ? (
                          <span className="text-destructive">Delayed by {Math.abs(impact.monthsDelta)} month{Math.abs(impact.monthsDelta) !== 1 ? 's' : ''}</span>
                        ) : (
                          <span>No change to timeline</span>
                        )
                      ) : impact.scenarioCompletion ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Complete by {formatMonth(impact.scenarioCompletion)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Timeline unchanged</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Comparison Chart placeholder */}
          <div className="p-4 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
            <p>Monthly comparison chart</p>
            <p className="text-xs mt-1">Showing {result.forecasts.length} months of projections</p>
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

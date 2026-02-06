// Re-export all planning utilities
export {
  detectRecurringPatterns,
  getUpcomingRecurring,
  estimateMonthlyRecurring,
  getMonthlyEquivalent,
  type DetectedPattern,
} from "./recurring-detection";

export {
  generateForecast,
  calculateCumulativeSavings,
  estimateGoalCompletion,
  getForecastSummary,
  type MonthlyForecast,
  type ForecastConfig,
} from "./forecast";

export {
  calculateGoalProgress,
  calculateAutoTrackedAmount,
  getContributionHistory,
  suggestMonthlyContribution,
  calculateAcceleratedCompletion,
  sortGoalsByPriority,
  type GoalProgress,
} from "./goals";

export {
  runSimulation,
  createQuickScenario,
  suggestScenarios,
  type SimulationResult,
  type ForecastComparison,
  type MonthlyDelta,
  type GoalImpact,
} from "./simulator";

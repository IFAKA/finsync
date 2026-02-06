import Dexie, { type EntityTable } from "dexie";

// Local database types with sync metadata
export interface LocalCategory {
  id: string; // UUID for sync
  serverId?: number; // Original server ID
  name: string;
  color: string;
  icon?: string;
  isSystem: boolean;
  createdAt: Date;
  // Sync metadata
  _lastModified: Date;
  _deleted: boolean;
}

export interface LocalTransaction {
  id: string; // UUID for sync
  serverId?: number; // Original server ID
  date: Date;
  description: string;
  rawDescription: string;
  amount: number;
  balance?: number;
  categoryId?: string; // References LocalCategory.id
  categoryConfidence?: number;
  merchant?: string;
  notes?: string;
  isRecurring: boolean;
  needsReview: boolean;
  importBatchId: string;
  sourceFile: string;
  bankName?: string;
  createdAt: Date;
  // Sync metadata
  _lastModified: Date;
  _deleted: boolean;
}

export interface LocalBudget {
  id: string; // UUID for sync
  serverId?: number; // Original server ID
  categoryId: string; // References LocalCategory.id
  monthlyLimit: number;
  month: string; // Format: "YYYY-MM"
  createdAt: Date;
  // Sync metadata
  _lastModified: Date;
  _deleted: boolean;
}

export type AmountMatchType = 'absolute' | 'expense' | 'income';

// Planning: Savings Goals
export interface LocalSavingsGoal {
  id: string;
  serverId?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  color: string;
  icon?: string;
  categoryId?: string; // Optional: auto-track from category
  trackingMode: 'manual' | 'auto';
  createdAt: Date;
  _lastModified: Date;
  _deleted: boolean;
}

// Planning: Recurring Transaction Patterns
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringSource = 'detected' | 'manual';

export interface LocalRecurringPattern {
  id: string;
  serverId?: number;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  frequency: RecurringFrequency;
  categoryId?: string;
  descriptionPattern?: string;
  nextDate?: Date;
  lastDate?: Date;
  isActive: boolean;
  confidence: number; // 0-1 for detected patterns
  source: RecurringSource;
  createdAt: Date;
  _lastModified: Date;
  _deleted: boolean;
}

// Planning: What-If Scenarios
export type ScenarioModificationType =
  | 'adjust_budget'
  | 'add_expense'
  | 'remove_expense'
  | 'add_income'
  | 'adjust_recurring';

export interface ScenarioModification {
  id: string;
  type: ScenarioModificationType;
  categoryId?: string;
  recurringPatternId?: string;
  amount?: number;
  description?: string;
}

export interface LocalScenario {
  id: string;
  serverId?: number;
  name: string;
  baseMonth: string; // Format: "YYYY-MM"
  modifications: ScenarioModification[];
  projectionMonths: number;
  createdAt: Date;
  _lastModified: Date;
  _deleted: boolean;
}

// Planning: Goal Contributions
export interface LocalGoalContribution {
  id: string;
  serverId?: number;
  goalId: string;
  amount: number;
  date: Date;
  transactionId?: string;
  createdAt: Date;
  _lastModified: Date;
  _deleted: boolean;
}

export interface LocalRule {
  id: string; // UUID for sync
  serverId?: number;
  name: string;
  categoryId?: string; // Optional: rules can set only displayName without category
  amountEquals?: number;
  amountMin?: number;
  amountMax?: number;
  amountMatchType?: AmountMatchType; // 'absolute' (default): match both, 'expense': negative only, 'income': positive only
  descriptionContains?: string;
  displayName?: string; // If set, matching transactions display this name
  priority: number;
  isEnabled: boolean;
  createdAt: Date;
  // Sync metadata
  _lastModified: Date;
  _deleted: boolean;
}

export interface SyncState {
  id: string; // 'main'
  lastSyncTimestamp?: Date;
  deviceId: string;
  roomCode?: string;
}

// Define the database
class BudgetDatabase extends Dexie {
  categories!: EntityTable<LocalCategory, "id">;
  transactions!: EntityTable<LocalTransaction, "id">;
  budgets!: EntityTable<LocalBudget, "id">;
  rules!: EntityTable<LocalRule, "id">;
  syncState!: EntityTable<SyncState, "id">;
  savingsGoals!: EntityTable<LocalSavingsGoal, "id">;
  recurringPatterns!: EntityTable<LocalRecurringPattern, "id">;
  scenarios!: EntityTable<LocalScenario, "id">;
  goalContributions!: EntityTable<LocalGoalContribution, "id">;

  constructor() {
    super("BudgetDB");

    this.version(1).stores({
      categories: "id, serverId, name, _lastModified, _deleted",
      transactions:
        "id, serverId, date, categoryId, importBatchId, _lastModified, _deleted",
      budgets: "id, serverId, categoryId, month, _lastModified, _deleted",
      rules: "id, serverId, categoryId, priority, _lastModified, _deleted",
      syncState: "id",
    });

    // Version 2: Planning features
    this.version(2).stores({
      categories: "id, serverId, name, _lastModified, _deleted",
      transactions:
        "id, serverId, date, categoryId, importBatchId, _lastModified, _deleted",
      budgets: "id, serverId, categoryId, month, _lastModified, _deleted",
      rules: "id, serverId, categoryId, priority, _lastModified, _deleted",
      syncState: "id",
      savingsGoals: "id, serverId, categoryId, _lastModified, _deleted",
      recurringPatterns: "id, serverId, categoryId, source, isActive, _lastModified, _deleted",
      scenarios: "id, serverId, baseMonth, _lastModified, _deleted",
      goalContributions: "id, serverId, goalId, date, transactionId, _lastModified, _deleted",
    });
  }
}

// Singleton instance
let dbInstance: BudgetDatabase | null = null;

export function getLocalDB(): BudgetDatabase {
  if (!dbInstance) {
    dbInstance = new BudgetDatabase();
  }
  return dbInstance;
}

// Generate UUID (with fallback for environments without crypto.randomUUID)
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Default categories for initialization
export const DEFAULT_CATEGORIES = [
  {
    name: "Food & Dining",
    color: "#ef4444",
    icon: "utensils",
    isSystem: true,
  },
  {
    name: "Groceries",
    color: "#f97316",
    icon: "shopping-cart",
    isSystem: true,
  },
  {
    name: "Transportation",
    color: "#eab308",
    icon: "car",
    isSystem: true,
  },
  { name: "Utilities", color: "#22c55e", icon: "zap", isSystem: true },
  {
    name: "Entertainment",
    color: "#3b82f6",
    icon: "film",
    isSystem: true,
  },
  {
    name: "Shopping",
    color: "#8b5cf6",
    icon: "shopping-bag",
    isSystem: true,
  },
  { name: "Health", color: "#ec4899", icon: "heart", isSystem: true },
  {
    name: "Subscriptions",
    color: "#06b6d4",
    icon: "repeat",
    isSystem: true,
  },
  { name: "Housing", color: "#a855f7", icon: "home", isSystem: true },
  { name: "Income", color: "#10b981", icon: "trending-up", isSystem: true },
  {
    name: "Transfer",
    color: "#64748b",
    icon: "arrow-right-left",
    isSystem: true,
  },
  { name: "Other", color: "#94a3b8", icon: "circle", isSystem: true },
];

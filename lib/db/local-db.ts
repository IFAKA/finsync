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

export interface LocalRule {
  id: string; // UUID for sync
  serverId?: number;
  name: string;
  categoryId: string;
  amountEquals?: number;
  amountMin?: number;
  amountMax?: number;
  descriptionContains?: string;
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

// Get or create device ID
export async function getDeviceId(): Promise<string> {
  const db = getLocalDB();
  let syncState = await db.syncState.get("main");

  if (!syncState) {
    const deviceId = generateId();
    syncState = {
      id: "main",
      deviceId,
    };
    await db.syncState.put(syncState);
  }

  return syncState.deviceId;
}

// Initialize with default categories if empty
export async function initializeLocalDB(): Promise<void> {
  const db = getLocalDB();

  // Check if categories exist
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const DEFAULT_CATEGORIES = [
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

    const now = new Date();
    const categories: LocalCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: generateId(),
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      isSystem: cat.isSystem,
      createdAt: now,
      _lastModified: now,
      _deleted: false,
    }));

    await db.categories.bulkPut(categories);
  }

  // Ensure device ID exists
  await getDeviceId();
}

// CRUD operations with sync metadata
export const localDB = {
  // Categories
  async getCategories(): Promise<LocalCategory[]> {
    const db = getLocalDB();
    return db.categories.filter((c) => !c._deleted).toArray();
  },

  async getCategoryById(id: string): Promise<LocalCategory | undefined> {
    const db = getLocalDB();
    const cat = await db.categories.get(id);
    return cat && !cat._deleted ? cat : undefined;
  },

  async createCategory(
    data: Omit<
      LocalCategory,
      "id" | "createdAt" | "_lastModified" | "_deleted"
    >
  ): Promise<LocalCategory> {
    const db = getLocalDB();
    const now = new Date();
    const category: LocalCategory = {
      ...data,
      id: generateId(),
      createdAt: now,
      _lastModified: now,
      _deleted: false,
    };
    await db.categories.put(category);
    return category;
  },

  async updateCategory(
    id: string,
    data: Partial<LocalCategory>
  ): Promise<void> {
    const db = getLocalDB();
    await db.categories.update(id, {
      ...data,
      _lastModified: new Date(),
    });
  },

  async deleteCategory(id: string): Promise<void> {
    const db = getLocalDB();
    await db.categories.update(id, {
      _deleted: true,
      _lastModified: new Date(),
    });
  },

  // Transactions
  async getTransactions(options?: {
    categoryId?: string;
    month?: string;
    limit?: number;
    offset?: number;
  }): Promise<LocalTransaction[]> {
    const db = getLocalDB();
    let collection = db.transactions.filter((t) => !t._deleted);

    if (options?.categoryId) {
      collection = collection.filter(
        (t) => t.categoryId === options.categoryId
      );
    }

    if (options?.month) {
      const [year, month] = options.month.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      collection = collection.filter(
        (t) => t.date >= startDate && t.date <= endDate
      );
    }

    let result = await collection.sortBy("date");
    result.reverse(); // Most recent first

    if (options?.offset) {
      result = result.slice(options.offset);
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  },

  async getTransactionById(id: string): Promise<LocalTransaction | undefined> {
    const db = getLocalDB();
    const tx = await db.transactions.get(id);
    return tx && !tx._deleted ? tx : undefined;
  },

  async createTransaction(
    data: Omit<
      LocalTransaction,
      "id" | "createdAt" | "_lastModified" | "_deleted"
    >
  ): Promise<LocalTransaction> {
    const db = getLocalDB();
    const now = new Date();
    const transaction: LocalTransaction = {
      ...data,
      id: generateId(),
      createdAt: now,
      _lastModified: now,
      _deleted: false,
    };
    await db.transactions.put(transaction);
    return transaction;
  },

  async updateTransaction(
    id: string,
    data: Partial<LocalTransaction>
  ): Promise<void> {
    const db = getLocalDB();
    await db.transactions.update(id, {
      ...data,
      _lastModified: new Date(),
    });
  },

  async deleteTransaction(id: string): Promise<void> {
    const db = getLocalDB();
    await db.transactions.update(id, {
      _deleted: true,
      _lastModified: new Date(),
    });
  },

  async bulkCreateTransactions(
    transactions: Omit<
      LocalTransaction,
      "id" | "createdAt" | "_lastModified" | "_deleted"
    >[]
  ): Promise<LocalTransaction[]> {
    const db = getLocalDB();
    const now = new Date();
    const created: LocalTransaction[] = transactions.map((t) => ({
      ...t,
      id: generateId(),
      createdAt: now,
      _lastModified: now,
      _deleted: false,
    }));
    await db.transactions.bulkPut(created);
    return created;
  },

  // Check for duplicate transactions based on date, amount, and description
  async findDuplicates(
    transactions: { date: Date; amount: number; description: string }[]
  ): Promise<Set<number>> {
    const db = getLocalDB();
    const duplicateIndices = new Set<number>();

    // Get all existing transactions (non-deleted)
    const existing = await db.transactions.filter((t) => !t._deleted).toArray();

    // Create a map for quick lookup: key = date+amount
    const existingMap = new Map<string, LocalTransaction[]>();
    for (const tx of existing) {
      const dateStr = tx.date.toISOString().split("T")[0];
      const key = `${dateStr}|${tx.amount}`;
      const list = existingMap.get(key) || [];
      list.push(tx);
      existingMap.set(key, list);
    }

    // Check each incoming transaction
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const dateStr = tx.date.toISOString().split("T")[0];
      const key = `${dateStr}|${tx.amount}`;

      const matches = existingMap.get(key);
      if (matches) {
        // Check if description is similar (case-insensitive, ignoring extra whitespace)
        const normalizedDesc = tx.description.toLowerCase().trim().replace(/\s+/g, " ");
        for (const match of matches) {
          const existingDesc = match.description.toLowerCase().trim().replace(/\s+/g, " ");
          // Consider duplicate if descriptions match or one contains the other
          if (
            normalizedDesc === existingDesc ||
            normalizedDesc.includes(existingDesc) ||
            existingDesc.includes(normalizedDesc)
          ) {
            duplicateIndices.add(i);
            break;
          }
        }
      }
    }

    return duplicateIndices;
  },

  // Budgets
  async getBudgets(month?: string): Promise<LocalBudget[]> {
    const db = getLocalDB();
    let collection = db.budgets.filter((b) => !b._deleted);

    if (month) {
      collection = collection.filter((b) => b.month === month);
    }

    return collection.toArray();
  },

  async createBudget(
    data: Omit<LocalBudget, "id" | "createdAt" | "_lastModified" | "_deleted">
  ): Promise<LocalBudget> {
    const db = getLocalDB();
    const now = new Date();
    const budget: LocalBudget = {
      ...data,
      id: generateId(),
      createdAt: now,
      _lastModified: now,
      _deleted: false,
    };
    await db.budgets.put(budget);
    return budget;
  },

  async updateBudget(id: string, data: Partial<LocalBudget>): Promise<void> {
    const db = getLocalDB();
    await db.budgets.update(id, {
      ...data,
      _lastModified: new Date(),
    });
  },

  async deleteBudget(id: string): Promise<void> {
    const db = getLocalDB();
    await db.budgets.update(id, {
      _deleted: true,
      _lastModified: new Date(),
    });
  },

  // Rules
  async getRules(): Promise<LocalRule[]> {
    const db = getLocalDB();
    return db.rules
      .filter((r) => !r._deleted)
      .sortBy("priority")
      .then((rules) => rules.reverse());
  },

  async createRule(
    data: Omit<LocalRule, "id" | "createdAt" | "_lastModified" | "_deleted">
  ): Promise<LocalRule> {
    const db = getLocalDB();
    const now = new Date();
    const rule: LocalRule = {
      ...data,
      id: generateId(),
      createdAt: now,
      _lastModified: now,
      _deleted: false,
    };
    await db.rules.put(rule);
    return rule;
  },

  async updateRule(id: string, data: Partial<LocalRule>): Promise<void> {
    const db = getLocalDB();
    await db.rules.update(id, {
      ...data,
      _lastModified: new Date(),
    });
  },

  async deleteRule(id: string): Promise<void> {
    const db = getLocalDB();
    await db.rules.update(id, {
      _deleted: true,
      _lastModified: new Date(),
    });
  },

  // Sync helpers
  async getChangedSince(
    timestamp: Date
  ): Promise<{
    categories: LocalCategory[];
    transactions: LocalTransaction[];
    budgets: LocalBudget[];
    rules: LocalRule[];
  }> {
    const db = getLocalDB();

    const [categories, transactions, budgets, rules] = await Promise.all([
      db.categories.filter((c) => c._lastModified > timestamp).toArray(),
      db.transactions.filter((t) => t._lastModified > timestamp).toArray(),
      db.budgets.filter((b) => b._lastModified > timestamp).toArray(),
      db.rules.filter((r) => r._lastModified > timestamp).toArray(),
    ]);

    return { categories, transactions, budgets, rules };
  },

  async mergeChanges(data: {
    categories?: LocalCategory[];
    transactions?: LocalTransaction[];
    budgets?: LocalBudget[];
    rules?: LocalRule[];
  }): Promise<void> {
    const db = getLocalDB();

    // Merge with last-write-wins strategy
    if (data.categories) {
      for (const incoming of data.categories) {
        const existing = await db.categories.get(incoming.id);
        if (!existing || incoming._lastModified > existing._lastModified) {
          await db.categories.put(incoming);
        }
      }
    }

    if (data.transactions) {
      for (const incoming of data.transactions) {
        const existing = await db.transactions.get(incoming.id);
        if (!existing || incoming._lastModified > existing._lastModified) {
          await db.transactions.put(incoming);
        }
      }
    }

    if (data.budgets) {
      for (const incoming of data.budgets) {
        const existing = await db.budgets.get(incoming.id);
        if (!existing || incoming._lastModified > existing._lastModified) {
          await db.budgets.put(incoming);
        }
      }
    }

    if (data.rules) {
      for (const incoming of data.rules) {
        const existing = await db.rules.get(incoming.id);
        if (!existing || incoming._lastModified > existing._lastModified) {
          await db.rules.put(incoming);
        }
      }
    }
  },

  // Get all data for full sync
  async getAllData(): Promise<{
    categories: LocalCategory[];
    transactions: LocalTransaction[];
    budgets: LocalBudget[];
    rules: LocalRule[];
  }> {
    const db = getLocalDB();

    const [categories, transactions, budgets, rules] = await Promise.all([
      db.categories.toArray(),
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.rules.toArray(),
    ]);

    return { categories, transactions, budgets, rules };
  },

  // Sync state
  async getSyncState(): Promise<SyncState | undefined> {
    const db = getLocalDB();
    return db.syncState.get("main");
  },

  async updateSyncState(data: Partial<SyncState>): Promise<void> {
    const db = getLocalDB();
    const current = await db.syncState.get("main");
    if (current) {
      await db.syncState.update("main", data);
    } else {
      await db.syncState.put({
        id: "main",
        deviceId: generateId(),
        ...data,
      });
    }
  },

  // Available months (for UI)
  async getAvailableMonths(): Promise<string[]> {
    const db = getLocalDB();
    const transactions = await db.transactions
      .filter((t) => !t._deleted)
      .toArray();

    const months = new Set<string>();
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthStr);
    }

    return Array.from(months).sort().reverse();
  },

  // Monthly summary
  async getMonthlySummary(
    month: string
  ): Promise<{
    income: number;
    expenses: number;
    savings: number;
    byCategory: { categoryId: string; amount: number }[];
  }> {
    const db = getLocalDB();
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const transactions = await db.transactions
      .filter((t) => !t._deleted && t.date >= startDate && t.date <= endDate)
      .toArray();

    let income = 0;
    let expenses = 0;
    const byCategory = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.amount > 0) {
        income += tx.amount;
      } else {
        expenses += Math.abs(tx.amount);
      }

      if (tx.categoryId) {
        const current = byCategory.get(tx.categoryId) || 0;
        byCategory.set(tx.categoryId, current + Math.abs(tx.amount));
      }
    }

    return {
      income,
      expenses,
      savings: income - expenses,
      byCategory: Array.from(byCategory.entries()).map(
        ([categoryId, amount]) => ({
          categoryId,
          amount,
        })
      ),
    };
  },

  // Reset all data (fresh start)
  async resetAllData(): Promise<void> {
    const db = getLocalDB();

    // Clear all tables
    await Promise.all([
      db.categories.clear(),
      db.transactions.clear(),
      db.budgets.clear(),
      db.rules.clear(),
    ]);

    // Reset sync state but keep device ID
    const currentState = await db.syncState.get("main");
    const deviceId = currentState?.deviceId || generateId();
    await db.syncState.put({
      id: "main",
      deviceId,
      lastSyncTimestamp: undefined,
      roomCode: undefined,
    });

    // Re-initialize default categories
    await initializeLocalDB();
  },
};

export type LocalDB = typeof localDB;

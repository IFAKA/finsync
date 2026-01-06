import {
  getLocalDB,
  generateId,
  DEFAULT_CATEGORIES,
  type LocalCategory,
  type LocalTransaction,
  type LocalBudget,
  type LocalRule,
  type SyncState,
} from "./schema";

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

// Get changes since a timestamp
export async function getChangedSince(
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
}

// Merge incoming changes with last-write-wins strategy
export async function mergeChanges(data: {
  categories?: LocalCategory[];
  transactions?: LocalTransaction[];
  budgets?: LocalBudget[];
  rules?: LocalRule[];
}): Promise<void> {
  const db = getLocalDB();

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
}

// Get all data for full sync
export async function getAllData(): Promise<{
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
}

// Sync state operations
export async function getSyncState(): Promise<SyncState | undefined> {
  const db = getLocalDB();
  return db.syncState.get("main");
}

export async function updateSyncState(data: Partial<SyncState>): Promise<void> {
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
}

// Reset all data (fresh start)
export async function resetAllData(): Promise<void> {
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
}

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

  const [changedCategories, transactions, budgets, rules] = await Promise.all([
    db.categories.filter((c) => c._lastModified > timestamp).toArray(),
    db.transactions.filter((t) => t._lastModified > timestamp).toArray(),
    db.budgets.filter((b) => b._lastModified > timestamp).toArray(),
    db.rules.filter((r) => r._lastModified > timestamp).toArray(),
  ]);

  // Also include categories referenced by changed transactions
  // This ensures the receiving device can properly remap category IDs
  const referencedCategoryIds = new Set<string>();
  for (const tx of transactions) {
    if (tx.categoryId) {
      referencedCategoryIds.add(tx.categoryId);
    }
  }

  // Get any referenced categories that weren't already in the changed set
  const changedCategoryIds = new Set(changedCategories.map((c) => c.id));
  const missingCategoryIds = [...referencedCategoryIds].filter(
    (id) => !changedCategoryIds.has(id)
  );

  let categories = changedCategories;
  if (missingCategoryIds.length > 0) {
    const referencedCategories = await db.categories
      .where("id")
      .anyOf(missingCategoryIds)
      .toArray();
    categories = [...changedCategories, ...referencedCategories];
  }

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
      // First check if category exists by ID
      const existingById = await db.categories.get(incoming.id);
      if (existingById) {
        // Same ID - use last-write-wins
        if (incoming._lastModified > existingById._lastModified) {
          await db.categories.put(incoming);
        }
      } else {
        // Check if a category with the same name already exists (prevent duplicates)
        const existingByName = await db.categories
          .filter((c) => c.name === incoming.name && !c._deleted)
          .first();

        if (existingByName) {
          // Category with same name exists - update existing if incoming is newer
          if (incoming._lastModified > existingByName._lastModified) {
            // Update existing category with incoming data but keep the existing ID
            await db.categories.update(existingByName.id, {
              color: incoming.color,
              icon: incoming.icon,
              isSystem: incoming.isSystem,
              _lastModified: incoming._lastModified,
            });
          }
          // Skip adding the incoming category since we already have one with this name
        } else {
          // New category - add it
          await db.categories.put(incoming);
        }
      }
    }
  }

  if (data.transactions) {
    // Build a map of remote category IDs to local category IDs (by name)
    const categoryIdMap = new Map<string, string>();
    if (data.categories) {
      for (const incomingCat of data.categories) {
        // Find the local category with the same name
        const localCat = await db.categories
          .filter((c) => c.name === incomingCat.name && !c._deleted)
          .first();
        if (localCat && localCat.id !== incomingCat.id) {
          // Map remote category ID to local category ID
          categoryIdMap.set(incomingCat.id, localCat.id);
        }
      }
    }

    // Build a map of existing transactions for content-based duplicate detection
    // Key: date|amount, Value: array of transactions with that date+amount
    const existingTxMap = new Map<string, LocalTransaction[]>();
    const allExisting = await db.transactions.filter((t) => !t._deleted).toArray();
    for (const tx of allExisting) {
      const dateStr = tx.date.toISOString().split("T")[0];
      const key = `${dateStr}|${tx.amount}`;
      const list = existingTxMap.get(key) || [];
      list.push(tx);
      existingTxMap.set(key, list);
    }

    for (const incoming of data.transactions) {
      // First check by ID (exact match)
      const existingById = await db.transactions.get(incoming.id);
      if (existingById) {
        // Same ID - use last-write-wins
        if (incoming._lastModified > existingById._lastModified) {
          // Remap categoryId if needed
          if (incoming.categoryId) {
            if (categoryIdMap.has(incoming.categoryId)) {
              incoming.categoryId = categoryIdMap.get(incoming.categoryId)!;
            } else {
              const localCategory = await db.categories.get(incoming.categoryId);
              if (!localCategory || localCategory._deleted) {
                incoming.categoryId = undefined;
                incoming.categoryConfidence = undefined;
              }
            }
          }
          await db.transactions.put(incoming);
        }
        continue;
      }

      // No ID match - check for content-based duplicate (same date, amount, similar description)
      const dateStr = incoming.date.toISOString().split("T")[0];
      const key = `${dateStr}|${incoming.amount}`;
      const potentialDupes = existingTxMap.get(key) || [];

      let isDuplicate = false;
      const normalizedDesc = incoming.description.toLowerCase().trim().replace(/\s+/g, " ");

      for (const existing of potentialDupes) {
        const existingDesc = existing.description.toLowerCase().trim().replace(/\s+/g, " ");
        // Consider duplicate if descriptions match or one contains the other
        if (
          normalizedDesc === existingDesc ||
          normalizedDesc.includes(existingDesc) ||
          existingDesc.includes(normalizedDesc)
        ) {
          isDuplicate = true;
          // If the incoming has a category and local doesn't, update the local one
          if (incoming.categoryId && !existing.categoryId) {
            let mappedCategoryId = incoming.categoryId;
            if (categoryIdMap.has(incoming.categoryId)) {
              mappedCategoryId = categoryIdMap.get(incoming.categoryId)!;
            }
            // Verify the category exists
            const localCategory = await db.categories.get(mappedCategoryId);
            if (localCategory && !localCategory._deleted) {
              await db.transactions.update(existing.id, {
                categoryId: mappedCategoryId,
                categoryConfidence: incoming.categoryConfidence,
                _lastModified: new Date(),
              });
            }
          }
          break;
        }
      }

      if (!isDuplicate) {
        // Not a duplicate - add the transaction
        // Remap categoryId if needed
        if (incoming.categoryId) {
          if (categoryIdMap.has(incoming.categoryId)) {
            incoming.categoryId = categoryIdMap.get(incoming.categoryId)!;
          } else {
            const localCategory = await db.categories.get(incoming.categoryId);
            if (!localCategory || localCategory._deleted) {
              incoming.categoryId = undefined;
              incoming.categoryConfidence = undefined;
            }
          }
        }
        await db.transactions.put(incoming);
        // Add to map for subsequent duplicate checks within this sync batch
        const list = existingTxMap.get(key) || [];
        list.push(incoming);
        existingTxMap.set(key, list);
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

// Deduplicate categories by name and update all references
export async function deduplicateCategories(): Promise<number> {
  const db = getLocalDB();
  const now = new Date();

  // Get all non-deleted categories
  const allCategories = await db.categories.filter((c) => !c._deleted).toArray();

  // Group by name
  const categoryGroups = new Map<string, LocalCategory[]>();
  for (const cat of allCategories) {
    const existing = categoryGroups.get(cat.name) || [];
    existing.push(cat);
    categoryGroups.set(cat.name, existing);
  }

  let duplicatesRemoved = 0;

  for (const [, cats] of categoryGroups) {
    if (cats.length <= 1) continue;

    // Sort by createdAt to keep the oldest one
    cats.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const keepCategory = cats[0];
    const duplicatesToRemove = cats.slice(1);

    for (const duplicate of duplicatesToRemove) {
      // Update transactions pointing to duplicate
      await db.transactions
        .where("categoryId")
        .equals(duplicate.id)
        .modify({ categoryId: keepCategory.id, _lastModified: now });

      // Update budgets pointing to duplicate
      await db.budgets
        .where("categoryId")
        .equals(duplicate.id)
        .modify({ categoryId: keepCategory.id, _lastModified: now });

      // Update rules pointing to duplicate
      await db.rules
        .where("categoryId")
        .equals(duplicate.id)
        .modify({ categoryId: keepCategory.id, _lastModified: now });

      // Soft delete the duplicate category
      await db.categories.update(duplicate.id, {
        _deleted: true,
        _lastModified: now,
      });

      duplicatesRemoved++;
    }
  }

  return duplicatesRemoved;
}

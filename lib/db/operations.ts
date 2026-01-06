import {
  getLocalDB,
  generateId,
  type LocalCategory,
  type LocalTransaction,
  type LocalBudget,
  type LocalRule,
} from "./schema";

// Categories CRUD
export async function getCategories(): Promise<LocalCategory[]> {
  const db = getLocalDB();
  return db.categories.filter((c) => !c._deleted).toArray();
}

export async function getCategoryById(id: string): Promise<LocalCategory | undefined> {
  const db = getLocalDB();
  const cat = await db.categories.get(id);
  return cat && !cat._deleted ? cat : undefined;
}

export async function createCategory(
  data: Omit<LocalCategory, "id" | "createdAt" | "_lastModified" | "_deleted">
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
}

export async function updateCategory(
  id: string,
  data: Partial<LocalCategory>
): Promise<void> {
  const db = getLocalDB();
  await db.categories.update(id, {
    ...data,
    _lastModified: new Date(),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const db = getLocalDB();
  await db.categories.update(id, {
    _deleted: true,
    _lastModified: new Date(),
  });
}

// Transactions CRUD
export async function getTransactions(options?: {
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
}

export async function getTransactionById(id: string): Promise<LocalTransaction | undefined> {
  const db = getLocalDB();
  const tx = await db.transactions.get(id);
  return tx && !tx._deleted ? tx : undefined;
}

export async function createTransaction(
  data: Omit<LocalTransaction, "id" | "createdAt" | "_lastModified" | "_deleted">
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
}

export async function updateTransaction(
  id: string,
  data: Partial<LocalTransaction>
): Promise<void> {
  const db = getLocalDB();
  await db.transactions.update(id, {
    ...data,
    _lastModified: new Date(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getLocalDB();
  await db.transactions.update(id, {
    _deleted: true,
    _lastModified: new Date(),
  });
}

export async function bulkCreateTransactions(
  transactions: Omit<LocalTransaction, "id" | "createdAt" | "_lastModified" | "_deleted">[]
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
}

export async function bulkUpdateTransactions(
  ids: string[],
  data: Partial<LocalTransaction>
): Promise<{ id: string; previousCategoryId?: string }[]> {
  const db = getLocalDB();
  const now = new Date();
  const previousStates: { id: string; previousCategoryId?: string }[] = [];

  // Get previous states for undo
  for (const id of ids) {
    const tx = await db.transactions.get(id);
    if (tx) {
      previousStates.push({ id, previousCategoryId: tx.categoryId });
    }
  }

  // Update all transactions
  await db.transactions
    .where("id")
    .anyOf(ids)
    .modify({ ...data, _lastModified: now });

  return previousStates;
}

export async function revertBulkUpdate(
  previousStates: { id: string; previousCategoryId?: string }[]
): Promise<void> {
  const db = getLocalDB();
  const now = new Date();

  for (const state of previousStates) {
    await db.transactions.update(state.id, {
      categoryId: state.previousCategoryId,
      _lastModified: now,
    });
  }
}

// Budgets CRUD
export async function getBudgets(month?: string): Promise<LocalBudget[]> {
  const db = getLocalDB();
  let collection = db.budgets.filter((b) => !b._deleted);

  if (month) {
    collection = collection.filter((b) => b.month === month);
  }

  return collection.toArray();
}

export async function createBudget(
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
}

export async function updateBudget(id: string, data: Partial<LocalBudget>): Promise<void> {
  const db = getLocalDB();
  await db.budgets.update(id, {
    ...data,
    _lastModified: new Date(),
  });
}

export async function deleteBudget(id: string): Promise<void> {
  const db = getLocalDB();
  await db.budgets.update(id, {
    _deleted: true,
    _lastModified: new Date(),
  });
}

// Rules CRUD
export async function getRules(): Promise<LocalRule[]> {
  const db = getLocalDB();
  return db.rules
    .filter((r) => !r._deleted)
    .sortBy("priority")
    .then((rules) => rules.reverse());
}

export async function createRule(
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
}

export async function updateRule(id: string, data: Partial<LocalRule>): Promise<void> {
  const db = getLocalDB();
  await db.rules.update(id, {
    ...data,
    _lastModified: new Date(),
  });
}

export async function deleteRule(id: string): Promise<void> {
  const db = getLocalDB();
  await db.rules.update(id, {
    _deleted: true,
    _lastModified: new Date(),
  });
}

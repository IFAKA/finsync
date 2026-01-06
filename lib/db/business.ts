import { getLocalDB, type LocalTransaction } from "./schema";

// Check for duplicate transactions based on date, amount, and description
export async function findDuplicates(
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
}

// Find transactions matching rule criteria (excluding a specific transaction)
export async function findSimilarTransactions(
  criteria: {
    descriptionContains?: string;
    amountMin?: number;
    amountMax?: number;
    amountEquals?: number;
  },
  excludeId?: string
): Promise<LocalTransaction[]> {
  const db = getLocalDB();

  let collection = db.transactions.filter((t) => !t._deleted);

  if (excludeId) {
    collection = collection.filter((t) => t.id !== excludeId);
  }

  const all = await collection.toArray();

  return all.filter((tx) => {
    // Description match (case-insensitive)
    if (criteria.descriptionContains) {
      const searchTerm = criteria.descriptionContains.toLowerCase();
      const matchesDesc =
        tx.rawDescription.toLowerCase().includes(searchTerm) ||
        tx.description.toLowerCase().includes(searchTerm);
      if (!matchesDesc) return false;
    }

    // Amount equals (with small tolerance for floating point)
    if (criteria.amountEquals !== undefined) {
      if (Math.abs(tx.amount - criteria.amountEquals) > 0.01) return false;
    }

    // Amount range
    if (criteria.amountMin !== undefined) {
      if (tx.amount < criteria.amountMin) return false;
    }
    if (criteria.amountMax !== undefined) {
      if (tx.amount > criteria.amountMax) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Available months (for UI)
export async function getAvailableMonths(): Promise<string[]> {
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
}

// Monthly summary
export async function getMonthlySummary(
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

    // Only count expenses (negative amounts) for category budgets
    // Refunds (positive amounts) should not be counted as spending
    if (tx.categoryId && tx.amount < 0) {
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
}

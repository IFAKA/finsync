import type { LocalTransaction, LocalRule } from "@/lib/db/schema";

/**
 * Checks if a transaction matches a rule's criteria
 */
function matchesRule(transaction: LocalTransaction, rule: LocalRule): boolean {
  // Description match (case-insensitive)
  if (rule.descriptionContains) {
    const searchTerm = rule.descriptionContains.toLowerCase();
    const matchesDesc =
      transaction.rawDescription.toLowerCase().includes(searchTerm) ||
      transaction.description.toLowerCase().includes(searchTerm);
    if (!matchesDesc) return false;
  }

  // Use absolute value for amount comparisons (expenses are negative)
  const absAmount = Math.abs(transaction.amount);

  // Amount equals (with small tolerance for floating point)
  if (rule.amountEquals != null) {
    if (Math.abs(absAmount - rule.amountEquals) > 0.01) return false;
  }

  // Amount range
  if (rule.amountMin != null) {
    if (absAmount < rule.amountMin) return false;
  }
  if (rule.amountMax != null) {
    if (absAmount > rule.amountMax) return false;
  }

  return true;
}

/**
 * Resolves the display name for a transaction based on matching alias rules.
 * Returns the first matching rule's displayName, or the original description.
 * Rules are assumed to be sorted by priority (highest first).
 */
export function getDisplayName(
  transaction: LocalTransaction,
  rules: LocalRule[]
): string {
  // Find the first matching rule that has a displayName
  const matchingRule = rules.find(
    (rule) => rule.displayName && matchesRule(transaction, rule)
  );

  return matchingRule?.displayName ?? transaction.description;
}

/**
 * Finds the first matching rule for a transaction (with displayName)
 */
export function findMatchingAliasRule(
  transaction: LocalTransaction,
  rules: LocalRule[]
): LocalRule | undefined {
  return rules.find(
    (rule) => rule.displayName && matchesRule(transaction, rule)
  );
}

// Re-export types and schema utilities
export {
  getLocalDB,
  generateId,
  DEFAULT_CATEGORIES,
  type LocalCategory,
  type LocalTransaction,
  type LocalBudget,
  type LocalRule,
  type SyncState,
} from "./schema";

// Re-export CRUD operations
export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkCreateTransactions,
  bulkUpdateTransactions,
  revertBulkUpdate,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getRules,
  createRule,
  updateRule,
  deleteRule,
} from "./operations";

// Re-export business logic
export {
  findDuplicates,
  findSimilarTransactions,
  getAvailableMonths,
  getMonthlySummary,
} from "./business";

// Re-export sync operations
export {
  getDeviceId,
  initializeLocalDB,
  getChangedSince,
  mergeChanges,
  getAllData,
  getSyncState,
  updateSyncState,
  resetAllData,
} from "./sync";

// Backward compatible localDB object
import * as operations from "./operations";
import * as business from "./business";
import * as sync from "./sync";

export const localDB = {
  // Categories
  getCategories: operations.getCategories,
  getCategoryById: operations.getCategoryById,
  createCategory: operations.createCategory,
  updateCategory: operations.updateCategory,
  deleteCategory: operations.deleteCategory,

  // Transactions
  getTransactions: operations.getTransactions,
  getTransactionById: operations.getTransactionById,
  createTransaction: operations.createTransaction,
  updateTransaction: operations.updateTransaction,
  deleteTransaction: operations.deleteTransaction,
  bulkCreateTransactions: operations.bulkCreateTransactions,
  bulkUpdateTransactions: operations.bulkUpdateTransactions,
  revertBulkUpdate: operations.revertBulkUpdate,

  // Budgets
  getBudgets: operations.getBudgets,
  createBudget: operations.createBudget,
  updateBudget: operations.updateBudget,
  deleteBudget: operations.deleteBudget,

  // Rules
  getRules: operations.getRules,
  createRule: operations.createRule,
  updateRule: operations.updateRule,
  deleteRule: operations.deleteRule,

  // Business logic
  findDuplicates: business.findDuplicates,
  findSimilarTransactions: business.findSimilarTransactions,
  getAvailableMonths: business.getAvailableMonths,
  getMonthlySummary: business.getMonthlySummary,

  // Sync
  getDeviceId: sync.getDeviceId,
  getChangedSince: sync.getChangedSince,
  mergeChanges: sync.mergeChanges,
  getAllData: sync.getAllData,
  getSyncState: sync.getSyncState,
  updateSyncState: sync.updateSyncState,
  resetAllData: sync.resetAllData,
};

export type LocalDB = typeof localDB;

import { Page, expect } from "@playwright/test";
import path from "path";

const DB_NAME = "BudgetDB";

/** Delete the IndexedDB database and reload so the app starts fresh. */
export async function clearDatabase(page: Page) {
  await page.evaluate((name) => indexedDB.deleteDatabase(name), DB_NAME);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Mark onboarding as completed so the app skips it on next navigation. */
export async function completeOnboarding(page: Page) {
  await page.evaluate(() =>
    localStorage.setItem("onboarding_completed", "true"),
  );
}

/** Seed default categories into IndexedDB via Dexie so pages render data. */
export async function seedCategories(page: Page) {
  await page.evaluate((dbName) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("categories", "readwrite");
        const store = tx.objectStore("categories");

        const categories = [
          { name: "Food & Dining", color: "#f97316", icon: "utensils" },
          { name: "Groceries", color: "#84cc16", icon: "shopping-cart" },
          { name: "Transportation", color: "#3b82f6", icon: "car" },
          { name: "Utilities", color: "#a855f7", icon: "zap" },
          { name: "Entertainment", color: "#ec4899", icon: "film" },
          { name: "Shopping", color: "#f59e0b", icon: "shopping-bag" },
          { name: "Health", color: "#ef4444", icon: "heart" },
          { name: "Subscriptions", color: "#6366f1", icon: "repeat" },
          { name: "Housing", color: "#14b8a6", icon: "home" },
          { name: "Income", color: "#22c55e", icon: "trending-up" },
          { name: "Transfer", color: "#64748b", icon: "arrow-right-left" },
          { name: "Other", color: "#9ca3af", icon: "circle" },
        ];

        for (const cat of categories) {
          const id = crypto.randomUUID();
          const now = new Date();
          store.put({
            id,
            ...cat,
            isSystem: true,
            createdAt: now,
            _lastModified: now,
            _deleted: false,
          });
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);
}

/** Upload a CSV file from the fixtures directory via the file input. */
export async function importCSV(page: Page, filename = "test-transactions.csv") {
  const filePath = path.join(__dirname, "fixtures", filename);
  const fileInput = page.locator("#file-upload");
  await fileInput.setInputFiles(filePath);
}

/** Wait for the app to finish initialising (Dexie + React hydration). */
export async function waitForApp(page: Page) {
  // The app shows a spinner with "Loading application..." sr-only text during init.
  // Wait for that to disappear, meaning the app is ready.
  await page.waitForSelector("text=Loading application...", {
    state: "hidden",
    timeout: 15_000,
  }).catch(() => {
    // If the text was never there (already loaded), that's fine.
  });
  // Give Dexie live queries a moment to populate
  await page.waitForTimeout(500);
}

/** Navigate to a page with onboarding already completed. */
export async function gotoWithOnboarding(page: Page, url = "/") {
  await page.goto(url);
  await completeOnboarding(page);
  await page.reload();
  await waitForApp(page);
}

/** Reduce motion to stabilise tests with Framer Motion animations. */
export async function reduceMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

/** Import the test CSV through the UI and wait for the damage report to finish. */
export async function importCSVThroughUI(page: Page, filename = "test-transactions.csv") {
  await importCSV(page, filename);
  // Wait for parsing to finish (success state shows filename)
  await expect(page.locator("text=Processing file...")).toBeHidden({
    timeout: 10_000,
  });
  // Wait for damage report to show import count
  await expect(page.getByText(/\d+ imported/)).toBeVisible({ timeout: 15_000 });
}

export const MOBILE_VIEWPORT = { width: 375, height: 667 };
export const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

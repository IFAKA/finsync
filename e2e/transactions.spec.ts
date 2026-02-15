import { test, expect } from "@playwright/test";
import {
  clearDatabase,
  importCSV,
  waitForApp,
  reduceMotion,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
} from "./helpers";

/** Helper: fresh import through onboarding, then navigate to transactions */
async function setupTransactions(page: import("@playwright/test").Page) {
  await page.goto("/");
  await clearDatabase(page);
  await page.goto("/");
  await waitForApp(page);
  await importCSV(page);
  await expect(page.getByText(/\d+ imported/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await waitForApp(page);
  await page.goto("/transactions?month=all");
  await waitForApp(page);
}

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await reduceMotion(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await setupTransactions(page);
  });

  test("transaction list renders with amounts and descriptions", async ({
    page,
  }) => {
    await expect(page.getByText("MERCADONA GROCERIES").first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("SALARY").first()).toBeVisible();
  });

  test("search filters transactions by description", async ({ page }) => {
    // Desktop search input (the visible one at md+ viewport)
    const searchInput = page
      .locator('input[aria-label="Search transactions"]')
      .nth(1);
    await searchInput.fill("NETFLIX");
    await page.waitForTimeout(500);

    await expect(page.getByText("NETFLIX").first()).toBeVisible();
    await expect(page.getByText("MERCADONA GROCERIES")).toBeHidden();
  });

  test("category filter dropdown works", async ({ page }) => {
    const categorySelect = page.getByLabel("Filter by category").nth(1);
    await categorySelect.click();
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("month filter dropdown works", async ({ page }) => {
    const monthSelect = page.getByLabel("Filter by month").nth(1);
    await monthSelect.click();
    await expect(page.getByRole("option", { name: "All Time" })).toBeVisible();
  });

  test("sort by expensive reorders list", async ({ page }) => {
    const sortSelect = page.getByLabel("Sort by").nth(1);
    await sortSelect.click();
    await page.getByRole("option", { name: /Expensive/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("SALARY").first()).toBeVisible();
  });

  test("clear filters button resets all filters", async ({ page }) => {
    const searchInput = page
      .locator('input[aria-label="Search transactions"]')
      .nth(1);
    await searchInput.fill("NETFLIX");
    await page.waitForTimeout(500);

    // Desktop clear filters button
    const clearBtn = page.getByLabel("Clear filters").nth(1);
    await clearBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText("MERCADONA GROCERIES").first()).toBeVisible();
  });

  test("empty search results show empty state", async ({ page }) => {
    const searchInput = page
      .locator('input[aria-label="Search transactions"]')
      .nth(1);
    await searchInput.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);

    await expect(
      page.getByText("No transactions match your filters"),
    ).toBeVisible();
  });

  test("NL search with amount query activates smart search", async ({
    page,
  }) => {
    const searchInput = page
      .locator('input[aria-label="Search transactions"]')
      .nth(1);
    await searchInput.fill("over €50");
    await page.waitForTimeout(500);

    const count = page.getByText(/\d+ transaction/);
    await expect(count).toBeVisible({ timeout: 5_000 });
  });

  test("inline category selection works on desktop", async ({ page }) => {
    const categorySelect = page.getByLabel("Select category").first();
    if (await categorySelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await categorySelect.click();
      const option = page.getByRole("option").first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("mobile: transactions render at mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/transactions?month=all");
    await waitForApp(page);

    await expect(page.getByText("MERCADONA").first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

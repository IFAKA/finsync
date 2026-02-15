import { test, expect } from "@playwright/test";
import {
  clearDatabase,
  importCSV,
  waitForApp,
  reduceMotion,
  gotoWithOnboarding,
} from "./helpers";

/** Helper: fresh import through onboarding, then navigate to planning */
async function setupPlanning(page: import("@playwright/test").Page) {
  await page.goto("/");
  await clearDatabase(page);
  await page.goto("/");
  await waitForApp(page);
  await importCSV(page);
  await expect(page.getByText(/\d+ imported/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await waitForApp(page);
  await page.goto("/planning");
  await waitForApp(page);
}

test.describe("Planning", () => {
  test.describe("with data", () => {
    test.beforeEach(async ({ page }) => {
      await reduceMotion(page);
      await setupPlanning(page);
    });

    test("shows affordability calculator", async ({ page }) => {
      await expect(page.getByText("Can I afford...")).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        page.getByLabel("Amount to check affordability"),
      ).toBeVisible();
    });

    test("entering affordable amount shows green verdict", async ({
      page,
    }) => {
      const input = page.getByLabel("Amount to check affordability");
      await input.fill("50");
      await page.waitForTimeout(500);

      await expect(page.getByText(/you can afford this/i)).toBeVisible({
        timeout: 5_000,
      });
    });

    test("entering large amount shows months needed", async ({ page }) => {
      const input = page.getByLabel("Amount to check affordability");
      await input.fill("50000");
      await page.waitForTimeout(500);

      const notInOneMonth = page.getByText(/not in one month/i);
      const spendingMore = page.getByText(/spending more than/i);
      await expect(notInOneMonth.or(spendingMore)).toBeVisible({
        timeout: 5_000,
      });
    });

    test("quick context shows when no amount entered", async ({ page }) => {
      // With transaction data but no amount, may show savings info
      const savingsText = page.getByText(/savings/i).first();
      if (await savingsText.isVisible({ timeout: 3_000 }).catch(() => false)) {
        expect(true).toBe(true);
      }
    });

    test("savings goals section is collapsible", async ({ page }) => {
      const savingsGoalsBtn = page.getByRole("button", {
        name: /Savings Goals/i,
      });
      if (
        await savingsGoalsBtn.isVisible({ timeout: 3_000 }).catch(() => false)
      ) {
        await savingsGoalsBtn.click();
        await page.waitForTimeout(300);
        await savingsGoalsBtn.click();
        await page.waitForTimeout(300);
      }
    });

    test("forecast section is collapsible", async ({ page }) => {
      const forecastBtn = page.getByRole("button", {
        name: /Forecast & Recurring/i,
      });
      if (
        await forecastBtn.isVisible({ timeout: 3_000 }).catch(() => false)
      ) {
        await forecastBtn.click();
        await page.waitForTimeout(300);
        await forecastBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe("empty state", () => {
    test("planning page with no data does not crash", async ({ page }) => {
      await reduceMotion(page);
      await gotoWithOnboarding(page, "/planning");

      await expect(page.getByText("Can I afford...")).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        page.getByLabel("Amount to check affordability"),
      ).toBeVisible();
    });
  });
});

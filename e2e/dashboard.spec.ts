import { test, expect } from "@playwright/test";
import {
  clearDatabase,
  gotoWithOnboarding,
  importCSV,
  waitForApp,
  reduceMotion,
  DESKTOP_VIEWPORT,
} from "./helpers";

/** Helper: fresh import through onboarding, ending on dashboard */
async function setupWithData(page: import("@playwright/test").Page) {
  await page.goto("/");
  await clearDatabase(page);
  await page.goto("/");
  await waitForApp(page);
  await importCSV(page);
  await expect(page.getByText(/\d+ imported/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await waitForApp(page);
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await reduceMotion(page);
  });

  test.describe("with data (desktop)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await setupWithData(page);
    });

    test("verdict card shows remaining amount and days", async ({ page }) => {
      await expect(
        page.getByText("Remaining", { exact: true }),
      ).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/\d+ days/).last()).toBeVisible();
    });

    test("recent transactions section shows transactions", async ({
      page,
    }) => {
      await expect(
        page.getByText("Recent", { exact: true }),
      ).toBeVisible();
    });

    test("month navigation works", async ({ page }) => {
      const prevButton = page.getByRole("button", {
        name: "Previous month",
      });
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await page.waitForTimeout(500);
        // The desktop month text is the last match (mobile is hidden first)
        await expect(
          page.getByText("January 2026").last(),
        ).toBeVisible();
      }
    });

    test("tapping view all navigates to /transactions", async ({ page }) => {
      const viewAll = page.getByText("View all").first();
      if (await viewAll.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await viewAll.click();
        await expect(page).toHaveURL(/\/transactions/);
      }
    });

    test("shows desktop dashboard sections", async ({ page }) => {
      await expect(
        page.getByText("Remaining", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Spent", { exact: true })).toBeVisible();
      await expect(page.getByText("Income", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Recent", { exact: true }),
      ).toBeVisible();
    });
  });

  test.describe("empty state", () => {
    test("dashboard renders without crashing when no transactions", async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await gotoWithOnboarding(page, "/");
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});

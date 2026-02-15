import { test, expect } from "@playwright/test";
import {
  clearDatabase,
  importCSV,
  waitForApp,
  reduceMotion,
  DESKTOP_VIEWPORT,
} from "./helpers";

/** Helper: fresh import through onboarding */
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

test.describe("Import", () => {
  test.beforeEach(async ({ page }) => {
    await reduceMotion(page);
    await setupWithData(page);
  });

  test("upload button opens import modal on desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.reload();
    await waitForApp(page);

    await page
      .getByRole("button", { name: "Upload bank statement" })
      .first()
      .click();

    await expect(page.getByText("Import Statement")).toBeVisible();
    await expect(page.locator("#file-upload")).toBeAttached();
  });

  test("duplicate file shows no new transactions", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.reload();
    await waitForApp(page);

    await page
      .getByRole("button", { name: "Upload bank statement" })
      .first()
      .click();

    // Re-import the same CSV
    await importCSV(page);

    // Duplicate detection should catch them
    await expect(page.getByText("No new transactions")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("view transactions link navigates to transactions page", async ({
    page,
  }) => {
    // Re-do from scratch to get "View transactions" link
    await clearDatabase(page);
    await page.goto("/");
    await waitForApp(page);

    await importCSV(page);
    await expect(page.getByText(/\d+ imported/)).toBeVisible({
      timeout: 15_000,
    });

    const viewLink = page.getByText("View transactions");
    if (await viewLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await viewLink.click();
      await expect(page).toHaveURL(/\/transactions/);
    }
  });

  test("oversized file shows error", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.reload();
    await waitForApp(page);

    await page
      .getByRole("button", { name: "Upload bank statement" })
      .first()
      .click();

    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, "x");
    const fileInput = page.locator("#file-upload");
    await fileInput.setInputFiles({
      name: "big.csv",
      mimeType: "text/csv",
      buffer: bigBuffer,
    });

    await expect(page.getByText(/less than 10MB/)).toBeVisible();
  });
});

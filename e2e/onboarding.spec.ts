import { test, expect } from "@playwright/test";
import {
  clearDatabase,
  importCSV,
  waitForApp,
  reduceMotion,
} from "./helpers";

test.describe("Onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await reduceMotion(page);
    await page.goto("/");
    await clearDatabase(page);
    await page.goto("/");
    await waitForApp(page);
  });

  test("fresh app shows onboarding with file upload dropzone", async ({
    page,
  }) => {
    await expect(
      page.getByText("Upload your bank statement to get started."),
    ).toBeVisible();
    await expect(page.locator("#file-upload")).toBeAttached();
    await expect(page.getByText("Browse")).toBeVisible();
  });

  test("upload CSV → imports → shows damage report → completes onboarding", async ({
    page,
  }) => {
    await importCSV(page);

    // Wait for damage report to finish importing
    await expect(page.getByText(/\d+ imported/)).toBeVisible({
      timeout: 15_000,
    });

    // Click Done to complete onboarding
    await page.getByRole("button", { name: "Done" }).click();

    // Should now be on the dashboard (use heading to avoid matching nav link)
    await expect(
      page.getByRole("heading", { name: "Dashboard" }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Verify onboarding flag is set
    const flag = await page.evaluate(() =>
      localStorage.getItem("onboarding_completed"),
    );
    expect(flag).toBe("true");
  });

  test("reload after onboarding stays on dashboard", async ({ page }) => {
    await importCSV(page);
    await expect(page.getByText(/\d+ imported/)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Done" }).click();
    await expect(
      page.getByRole("heading", { name: "Dashboard" }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Reload
    await page.reload();
    await waitForApp(page);

    // Should still be on dashboard, not onboarding
    await expect(
      page.getByText("Upload your bank statement to get started."),
    ).toBeHidden();
  });

  test("upload invalid file type shows error", async ({ page }) => {
    const fileInput = page.locator("#file-upload");
    // text/plain is accepted (CSV fallback), so use a truly invalid type
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("This is not a valid file"),
    });

    await expect(
      page.getByText(/Please upload an Excel or CSV file/),
    ).toBeVisible();
  });

  test("upload empty CSV shows error", async ({ page }) => {
    const fileInput = page.locator("#file-upload");
    await fileInput.setInputFiles({
      name: "empty.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(""),
    });

    // Should show some error about no transactions found
    await expect(page.locator('[role="alert"]')).toBeVisible({
      timeout: 5_000,
    });
  });
});

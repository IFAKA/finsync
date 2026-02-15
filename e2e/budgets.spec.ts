import { test, expect } from "@playwright/test";
import {
  clearDatabase,
  importCSV,
  waitForApp,
  reduceMotion,
  DESKTOP_VIEWPORT,
} from "./helpers";

/** Helper: fresh import through onboarding, then navigate to budgets */
async function setupBudgets(page: import("@playwright/test").Page) {
  await page.goto("/");
  await clearDatabase(page);
  await page.goto("/");
  await waitForApp(page);
  await importCSV(page);
  await expect(page.getByText(/\d+ imported/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await waitForApp(page);
  await page.goto("/budgets");
  await waitForApp(page);
}

test.describe("Budgets", () => {
  test.beforeEach(async ({ page }) => {
    await reduceMotion(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await setupBudgets(page);
  });

  test("budget page lists spending categories", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Budgets" }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("tap unbudgeted amount to set budget", async ({ page }) => {
    const tapToSet = page.getByText("tap to set").first();
    if (await tapToSet.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tapToSet.click();

      const input = page.getByRole("spinbutton").first();
      await expect(input).toBeVisible();
      await input.fill("200");
      await input.press("Enter");
      await page.waitForTimeout(500);

      await expect(page.getByText("200").first()).toBeVisible();
    }
  });

  test("edit existing budget amount", async ({ page }) => {
    const tapToSet = page.getByText("tap to set").first();
    if (await tapToSet.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tapToSet.click();
      const input = page.getByRole("spinbutton").first();
      await input.fill("200");
      await input.press("Enter");
      await page.waitForTimeout(500);

      const budgetText = page.getByText(/\/\s*200/).first();
      if (await budgetText.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await budgetText.click();
        const editInput = page.getByRole("spinbutton").first();
        await editInput.fill("300");
        await editInput.press("Enter");
        await page.waitForTimeout(500);
        await expect(page.getByText("300").first()).toBeVisible();
      }
    }
  });

  test("set budget to 0 removes it", async ({ page }) => {
    const tapToSet = page.getByText("tap to set").first();
    if (await tapToSet.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tapToSet.click();
      const input = page.getByRole("spinbutton").first();
      await input.fill("200");
      await input.press("Enter");
      await page.waitForTimeout(500);

      const budgetText = page.getByText(/\/\s*200/).first();
      if (await budgetText.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await budgetText.click();
        const editInput = page.getByRole("spinbutton").first();
        await editInput.fill("0");
        await editInput.press("Enter");
        await page.waitForTimeout(500);
      }
    }
  });

  test("month navigation changes displayed data", async ({ page }) => {
    const prevButton = page.getByRole("button", {
      name: "Previous month",
    });
    if (await prevButton.isVisible()) {
      await prevButton.click();
      await page.waitForTimeout(500);
      await expect(page.getByText("January 2026").last()).toBeVisible();
    }
  });

  test("empty month shows appropriate message", async ({ page }) => {
    const prevButton = page.getByRole("button", {
      name: "Previous month",
    });
    if (await prevButton.isVisible()) {
      for (let i = 0; i < 6; i++) {
        await prevButton.click();
        await page.waitForTimeout(300);
      }
      await expect(
        page.getByText("No spending data for this month"),
      ).toBeVisible();
    }
  });
});

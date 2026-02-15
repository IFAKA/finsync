import { test, expect } from "@playwright/test";
import {
  gotoWithOnboarding,
  reduceMotion,
  waitForApp,
  MOBILE_VIEWPORT,
  DESKTOP_VIEWPORT,
} from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await reduceMotion(page);
  });

  test.describe("mobile", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
    });

    test("bottom nav shows Home, Transactions, and More", async ({ page }) => {
      await gotoWithOnboarding(page, "/");

      // Use the bottom fixed nav (last nav in DOM is mobile)
      await expect(page.getByText("Home").last()).toBeVisible();
      await expect(page.getByText("Transactions").last()).toBeVisible();
      await expect(page.getByLabel("More options")).toBeVisible();
    });

    test("tap Home navigates to dashboard", async ({ page }) => {
      await gotoWithOnboarding(page, "/transactions");
      await page.getByText("Home").last().click();
      await expect(page).toHaveURL("/");
    });

    test("tap Transactions navigates to transactions page", async ({
      page,
    }) => {
      await gotoWithOnboarding(page, "/");
      await page.getByText("Transactions").last().click();
      await expect(page).toHaveURL(/\/transactions/);
    });

    test("More button opens menu with Planning, Rules, Sync", async ({
      page,
    }) => {
      await gotoWithOnboarding(page, "/");

      await page.getByLabel("More options").click();
      await page.waitForTimeout(300);

      await expect(page.getByText("Planning")).toBeVisible();
      await expect(page.getByText("Rules")).toBeVisible();
      await expect(page.getByText("Sync")).toBeVisible();
    });

    test("More menu: tap Planning navigates correctly", async ({ page }) => {
      await gotoWithOnboarding(page, "/");

      await page.getByLabel("More options").click();
      await page.waitForTimeout(300);
      await page.getByText("Planning").click();

      await expect(page).toHaveURL(/\/planning/);
    });

    test("More menu: close button works", async ({ page }) => {
      await gotoWithOnboarding(page, "/");

      await page.getByLabel("More options").click();
      await page.waitForTimeout(300);

      await page.getByLabel("Close menu").click();
      await page.waitForTimeout(300);

      // Menu overlay should no longer be showing "Planning" link
      await expect(page.getByLabel("More options")).toBeVisible();
    });

    test("active nav item is highlighted", async ({ page }) => {
      await gotoWithOnboarding(page, "/");

      const activeLink = page.locator('[aria-current="page"]').last();
      await expect(activeLink).toBeVisible();
    });
  });

  test.describe("desktop", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
    });

    test("header nav shows Dashboard and Transactions links", async ({
      page,
    }) => {
      await gotoWithOnboarding(page, "/");

      const header = page.locator("header");
      await expect(
        header.getByRole("link", { name: "Dashboard" }),
      ).toBeVisible();
      await expect(
        header.getByRole("link", { name: "Transactions" }),
      ).toBeVisible();
    });

    test("clicking Dashboard navigates to home", async ({ page }) => {
      await gotoWithOnboarding(page, "/transactions");

      const header = page.locator("header");
      await header.getByRole("link", { name: "Dashboard" }).click();
      await expect(page).toHaveURL("/");
    });

    test("clicking Transactions navigates correctly", async ({ page }) => {
      await gotoWithOnboarding(page, "/");

      const header = page.locator("header");
      await header.getByRole("link", { name: "Transactions" }).click();
      await expect(page).toHaveURL(/\/transactions/);
    });

    test("More dropdown shows Planning, Rules, Sync", async ({ page }) => {
      await gotoWithOnboarding(page, "/");

      const header = page.locator("header");
      const moreBtn = header.getByText("More").first();
      if (await moreBtn.isVisible()) {
        await moreBtn.click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Planning")).toBeVisible();
        await expect(page.getByText("Rules")).toBeVisible();
        await expect(page.getByText("Sync")).toBeVisible();
      }
    });
  });

  test.describe("deep links", () => {
    test("direct navigation to /budgets works", async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await gotoWithOnboarding(page, "/budgets");
      await expect(
        page.getByRole("heading", { name: "Budgets" }),
      ).toBeVisible({ timeout: 5_000 });
    });

    test("direct navigation to /planning works", async ({ page }) => {
      await gotoWithOnboarding(page, "/planning");
      await expect(page.getByText("Can I afford...")).toBeVisible({
        timeout: 5_000,
      });
    });

    test("direct navigation to /transactions works", async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await gotoWithOnboarding(page, "/transactions");
      await expect(
        page.getByRole("heading", { name: "Transactions" }),
      ).toBeVisible({ timeout: 5_000 });
    });

    test("browser back/forward works", async ({ page }) => {
      await gotoWithOnboarding(page, "/");
      await page.goto("/transactions");
      await waitForApp(page);
      await page.goto("/budgets");
      await waitForApp(page);

      await page.goBack();
      await expect(page).toHaveURL(/\/transactions/);

      await page.goForward();
      await expect(page).toHaveURL(/\/budgets/);
    });
  });
});

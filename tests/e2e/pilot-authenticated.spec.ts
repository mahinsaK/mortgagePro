import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
} from "./helpers";

const lenderEmail = process.env.E2E_LENDER_EMAIL;
const lenderPassword = process.env.E2E_LENDER_PASSWORD;
const collectorUsername = process.env.E2E_COLLECTOR_USERNAME;
const collectorPassword = process.env.E2E_COLLECTOR_PASSWORD;
const dedicatedProjectEnabled =
  process.env.E2E_TEST_PROJECT_MARKER === "MORTGAGEPRO_DEDICATED_TEST_PROJECT";

test.describe("dedicated pilot lender journey", () => {
  test.skip(
    !dedicatedProjectEnabled || !lenderEmail || !lenderPassword,
    "Dedicated test-project lender credentials are required",
  );

  test("@critical lender can traverse every completed portal module", async ({
    page,
  }) => {
    await loginLender(page);

    for (const route of [
      "/dashboard/lender",
      "/borrowers",
      "/collectors",
      "/loans",
      "/payments",
      "/payments/daily",
      "/sms",
      "/settings",
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${escapeRegex(route)}(?:\\?|$)`));
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("unfinished pilot routes return not found after authentication", async ({
    page,
  }) => {
    await loginLender(page);

    for (const route of [
      "/analytics",
      "/notifications",
      "/dashboard/borrower",
      "/dashboard/collector",
    ]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(404);
    }
  });

  test("dashboard has no serious accessibility violations", async ({ page }) => {
    await loginLender(page);
    await expectNoSeriousAccessibilityViolations(page);
  });
});

test.describe("dedicated pilot collector journey", () => {
  test.skip(
    !dedicatedProjectEnabled || !collectorUsername || !collectorPassword,
    "Dedicated test-project collector credentials are required",
  );

  test("@critical collector reaches the QR scanner", async ({ page }) => {
    await page.goto("/collector/login");
    await page.getByLabel("Username").fill(collectorUsername!);
    await page.getByLabel("Password").fill(collectorPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/collector\/scan/);
    await expect(page.getByRole("button", { name: /start scanning/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });
});

async function loginLender(page: import("@playwright/test").Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(lenderEmail!);
  await page.getByLabel("Password").fill(lenderPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/lender/);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

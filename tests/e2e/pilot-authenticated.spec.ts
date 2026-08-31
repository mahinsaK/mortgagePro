import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
} from "./helpers";

const lenderEmail = process.env.E2E_LENDER_EMAIL;
const lenderPassword = process.env.E2E_LENDER_PASSWORD;
const collectorUsername = process.env.E2E_COLLECTOR_USERNAME;
const collectorPassword = process.env.E2E_COLLECTOR_PASSWORD;
const pendingLenderEmail = process.env.E2E_PENDING_LENDER_EMAIL;
const pendingLenderPassword = process.env.E2E_PENDING_LENDER_PASSWORD;
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
      "/notifications",
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

  test("loan QR details provide download, share, and print actions", async ({
    page,
  }) => {
    await loginLender(page);
    await page.goto("/loans");
    await page.getByRole("button", { name: "Preview QR" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Loan QR code" }),
    ).toBeVisible();
    await expect(page.getByAltText("QR code for this loan")).toBeVisible();
    await page.getByRole("button", { name: "Close QR preview" }).click();
    await expect(
      page.getByRole("button", { name: "Download QR" }).first(),
    ).toBeEnabled();
    await page.getByRole("cell", { name: "E2E Alpha Borrower" }).click();

    await expect(page.getByRole("button", { name: "Download QR" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Share QR" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Print QR" })).toBeEnabled();
  });

  test("local notification bell opens the actionable notification workflow", async ({
    page,
  }) => {
    await loginLender(page);

    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View all" })).toBeVisible();
    await page.getByRole("link", { name: "View all" }).click();

    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByRole("heading", { name: "Local advice" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("cross-tenant loans, QR codes, and exports remain isolated", async ({
    page,
  }) => {
    await loginLender(page);

    const payments = await page.request.get(
      "/api/loans/e2e_loan_beta/payments",
    );
    const qrCode = await page.request.get("/api/loans/e2e_loan_beta/qr");
    const borrowerExport = await page.request.get(
      "/api/exports/borrowers?start=2020-01-01&end=2035-12-31",
    );

    expect(payments.status()).toBe(404);
    expect(qrCode.status()).toBe(404);
    expect(borrowerExport.status()).toBe(200);
    const csv = await borrowerExport.text();
    expect(csv).toContain("E2E Alpha Borrower");
    expect(csv).not.toContain("E2E Beta Borrower");
  });

  test("pending lenders cannot establish an application session", async ({
    page,
  }) => {
    test.skip(
      !pendingLenderEmail || !pendingLenderPassword,
      "Pending lender credentials are required",
    );
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(pendingLenderEmail!);
    await page.getByLabel("Password").fill(pendingLenderPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/auth\/login\?status=error/);
    await expect(page.getByText(/no active lender profile/i)).toBeVisible();
    await page.goto("/dashboard/lender");
    await expect(page).toHaveURL(/\/auth\/login/);
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
    await page.getByRole("button", { name: "Continue to scanner" }).click();

    await expect(page).toHaveURL(/\/collector\/scan/);
    await expect(page.getByRole("button", { name: /start scanning/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("collector cannot resolve another lender's QR loan", async ({ page }) => {
    await page.goto("/collector/login");
    await page.getByLabel("Username").fill(collectorUsername!);
    await page.getByLabel("Password").fill(collectorPassword!);
    await page.getByRole("button", { name: "Continue to scanner" }).click();
    await expect(page).toHaveURL(/\/collector\/scan/);

    const response = await page.request.get(
      "/api/collector/loan?loanId=e2e_loan_beta",
    );
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "That QR code is not a valid loan.",
    });
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

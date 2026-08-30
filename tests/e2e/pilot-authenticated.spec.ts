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

  test("lender can complete the SMS template and recipient workflow without sending", async ({
    page,
  }) => {
    const templateName = "E2E browser template";
    const renamedTemplate = "E2E browser template updated";

    await loginLender(page);
    await page.goto("/sms");
    await expect(
      page.getByRole("heading", { name: "Current month" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Recent SMS batches" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Check usage" }).click();
    await expect(
      page.getByRole("heading", { name: "Current month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent SMS batches" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete sender ID" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Request sender ID" }),
    ).toHaveCount(0);
    const smsSectionHeadings = await page.locator("h2").allTextContents();
    expect(smsSectionHeadings.indexOf("Current month")).toBeLessThan(
      smsSectionHeadings.indexOf("Sender and automatic payments"),
    );
    await deleteSmsTemplateIfPresent(page, templateName);
    await deleteSmsTemplateIfPresent(page, renamedTemplate);

    try {
      await expect(page.getByText(/E2EAlpha is awaiting review/i)).toBeVisible();
      await page.getByRole("button", { name: "New template" }).click();

      const createForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Save template" }),
      });
      await createForm.getByLabel("Template name").fill(templateName);
      await createForm
        .getByLabel("Message")
        .fill("Please make your scheduled payment today.");
      await createForm.getByRole("button", { name: "Save template" }).click();

      await expect(
        page.getByRole("button", { name: `Edit ${templateName}` }),
      ).toBeVisible();
      const paymentTemplate = page.getByLabel("Payment template");
      await expect(
        paymentTemplate.getByRole("option", { name: templateName }),
      ).toHaveCount(1);
      await paymentTemplate.selectOption({ label: templateName });
      await expect(
        page.getByText("Automatic payment settings saved."),
      ).toBeVisible();

      const automaticPaymentSwitch = page.getByRole("switch");
      const wasEnabled = await automaticPaymentSwitch.isChecked();
      await automaticPaymentSwitch.click();
      await expect(automaticPaymentSwitch).toBeChecked({ checked: !wasEnabled });
      await expect(
        page.getByText("Automatic payment settings saved."),
      ).toBeVisible();
      const settingsSection = page
        .getByRole("heading", { name: "Sender and automatic payments" })
        .locator("xpath=ancestor::section");
      await expect(
        settingsSection.getByRole("button", { name: "Save", exact: true }),
      ).toHaveCount(0);

      await page.getByRole("button", { name: `Edit ${templateName}` }).click();

      const editForm = page.locator("form").filter({
        has: page.locator('input[name="template_id"]'),
      });
      await editForm.getByLabel("Template name").fill(renamedTemplate);
      await editForm
        .getByLabel("Message")
        .fill("Updated payment reminder for the browser workflow.");
      await editForm.getByRole("button", { name: "Save", exact: true }).click();

      const templateCard = page.getByRole("article").filter({
        has: page.getByRole("button", { name: `Edit ${renamedTemplate}` }),
      });
      await expect(templateCard).toBeVisible();
      await templateCard.getByRole("button", { name: "Use message" }).click();

      await page.getByLabel("Search borrowers").fill("E2E Alpha");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      const borrowerResult = page.getByRole("article").filter({
        hasText: "E2E Alpha Borrower",
      });
      await borrowerResult.getByRole("button", { name: "Add" }).click();
      await page.getByLabel("Add a custom phone number").fill("+94775555555");
      await page.getByRole("button", { name: "Add", exact: true }).click();

      const selectedForm = page.locator("form").filter({
        has: page.locator('input[name="recipients"]'),
      });
      await expect(selectedForm.getByLabel("Message")).toHaveValue(
        "Updated payment reminder for the browser workflow.",
      );
      await expect(page.getByText("E2E Alpha Borrower · +94771111111")).toBeVisible();
      await expect(page.getByText("+94775555555", { exact: true })).toBeVisible();
      await expect(page.getByText(/2 units for the selected list/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Send selected" }),
      ).toBeDisabled();
    } finally {
      await deleteSmsTemplateIfPresent(page, templateName);
      await deleteSmsTemplateIfPresent(page, renamedTemplate);
    }
  });

  test("@critical SMS workflow remains usable on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["iphone-critical", "android-critical"].includes(testInfo.project.name),
      "Mobile-only SMS workflow",
    );
    await loginLender(page);
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().includes("Hydration failed")
      ) {
        hydrationErrors.push(message.text());
      }
    });
    await page.goto("/sms");
    await page.getByRole("button", { name: "Check usage" }).click();

    const quickSms = page.getByRole("heading", { name: "Single number" }).locator(
      "xpath=ancestor::section",
    );
    await quickSms.getByLabel("Phone number").fill("+94776666666");
    await quickSms.getByLabel("Message").fill("Mobile payment reminder");
    await expect(quickSms.getByText(/1 unit$/)).toBeVisible();
    await expect(quickSms.getByRole("button", { name: "Send SMS" })).toBeDisabled();

    await page.getByLabel("Add a custom phone number").fill("+94777777777");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const selectedForm = page.locator("form").filter({
      has: page.locator('input[name="recipients"]'),
    });
    await selectedForm.getByLabel("Message").fill("Mobile selected reminder");

    await expect(page.getByText("+94777777777", { exact: true })).toBeVisible();
    await expect(page.getByText(/1 unit for the selected list/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
    expect(hydrationErrors).toEqual([]);
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

async function deleteSmsTemplateIfPresent(
  page: import("@playwright/test").Page,
  templateName: string,
) {
  const editButton = page.getByRole("button", {
    name: `Edit ${templateName}`,
  });
  if ((await editButton.count()) === 0) return;

  const templateCard = page.getByRole("article").filter({ has: editButton });
  page.once("dialog", (dialog) => dialog.accept());
  await templateCard
    .getByRole("button", { name: `Delete ${templateName}` })
    .click();
  await expect(editButton).toHaveCount(0);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

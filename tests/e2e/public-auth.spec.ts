import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
} from "./helpers";

test.describe("public authentication surfaces", () => {
  test("@public @critical lender login is accessible and responsive", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public registration explains the approval workflow", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(
      page.getByRole("heading", { name: "Request lender access" }),
    ).toBeVisible();
    await expect(page.getByLabel("Company name")).toBeVisible();
    await expect(page.getByLabel("Business email")).toBeVisible();
    await expect(page.getByText(/reviewed and approved/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public @critical collector login is accessible and responsive", async ({
    page,
  }) => {
    await page.goto("/collector/login");

    await expect(
      page.getByRole("heading", { name: "Sign in to collect" }),
    ).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public @critical root renders the MortgagePro landing page", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /every loan\. every collection\. one clear view\./i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request lender access" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Lender sign in" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Collector access" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public lenders can explore each product workflow", async ({ page }) => {
    await page.goto("/");

    const workflows = [
      ["Borrowers & loans", "Keep every borrower and loan in view."],
      ["QR collections", "Give field collectors a simpler way to record payments."],
      ["Payments & exports", "See what came in today, then take the record with you."],
      ["Borrower messages", "Send useful updates from the same workspace."],
    ] as const;

    for (const [buttonName, heading] of workflows) {
      const button = page.getByRole("button", { name: buttonName });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public the sample QR collection updates the illustrated lender desk", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("tab", { name: "Collector scanner" }).click();
    await page.getByRole("button", { name: "Test sample daily payment" }).click();
    await expect(page.getByRole("status")).toContainText("LKR 585");

    await page.getByRole("button", { name: "View updated lender desk" }).click();
    await expect(page.getByText("LKR 1,485")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("@public mobile inputs use a zoom-safe font size", async ({ page }, testInfo) => {
    test.skip(
      !["iphone-critical", "android-critical"].includes(testInfo.project.name),
      "Mobile-only assertion",
    );
    await page.goto("/collector/login");

    const fontSize = await page.getByLabel("Username").evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test("@public public entry pages fit supported responsive widths", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Viewport matrix runs once in Chromium",
    );

    for (const width of [320, 375, 390, 430, 480, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({
        height: width >= 1280 ? 960 : 844,
        width,
      });

      for (const route of [
        "/",
        "/auth/login",
        "/auth/register",
        "/auth/password-reset",
        "/collector/login",
      ]) {
        await page.goto(route);
        await expectNoHorizontalOverflow(page);
      }

      await page.goto("/auth/login");
      const overviewHeading = page.getByRole("heading", {
        name: "Keep your lending operations in view.",
      });
      const collectorShortcut = page.getByRole("link", { name: "Collector login" });
      if (width >= 1024) {
        await expect(overviewHeading).toBeVisible();
        await expect(collectorShortcut).toBeHidden();
      } else {
        await expect(overviewHeading).toBeHidden();
        if (width < 768) {
          await expect(collectorShortcut).toBeVisible();
        } else {
          await expect(collectorShortcut).toBeHidden();
        }
      }
    }
  });
});

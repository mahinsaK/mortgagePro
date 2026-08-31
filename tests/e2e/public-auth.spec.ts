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

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public registration explains the approval workflow", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(
      page.getByRole("heading", { name: "Create your lender account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Company name")).toBeVisible();
    await expect(page.getByLabel("Business email")).toBeVisible();
    await expect(page.getByText(/reviewed and activated/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public @critical collector login is accessible and responsive", async ({
    page,
  }) => {
    await page.goto("/collector/login");

    await expect(
      page.getByRole("heading", { name: "Scan QR code" }),
    ).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("@public @critical root selects the expected login for the device", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    if (["iphone-critical", "android-critical"].includes(testInfo.project.name)) {
      await expect(page).toHaveURL(/\/collector\/login/);
    } else {
      await expect(page).toHaveURL(/\/auth\/login/);
    }
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

  test("@public public entry pages fit supported mobile widths", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Viewport matrix runs once in Chromium",
    );

    for (const width of [320, 375, 390, 430, 480, 768]) {
      await page.setViewportSize({ height: 844, width });

      for (const route of [
        "/auth/login",
        "/auth/register",
        "/auth/password-reset",
        "/collector/login",
      ]) {
        await page.goto(route);
        await expectNoHorizontalOverflow(page);
      }
    }
  });
});

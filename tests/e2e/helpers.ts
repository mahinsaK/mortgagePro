import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  );

  expect(blocking, formatViolations(blocking)).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

function formatViolations(
  violations: Array<{
    help: string;
    id: string;
    impact?: string | null;
    nodes: Array<{ target: unknown }>;
  }>,
) {
  return violations
    .map(
      (violation) =>
        `${violation.impact ?? "unknown"}: ${violation.id} (${violation.help}) at ${violation.nodes
          .map((node) => JSON.stringify(node.target))
          .join(", ")}`,
    )
    .join("\n");
}

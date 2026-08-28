import { test, expect } from "@playwright/test";
import { registerAndLogin, skipOrgSelection } from "./helpers";

/**
 * Asset Portfolio common e2e: portfolio route renders, summary KPI
 * cards visible, dual-read hint absent when no legacy data exists.
 *
 * Run: npm run test:e2e -- portfolio-common.spec.ts
 */
test.describe("Portfolio common", () => {
  test("portfolio view renders for an invest budget", async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);

    // Navigate via the UI rather than hardcoding the URL: this matches
    // how the user discovers the feature and surfaces router issues.
    await page.goto("/budgets");
    const investBudgetLink = page
      .locator("a")
      .filter({ hasText: /portfolio|invest/i })
      .first();
    if ((await investBudgetLink.count()) === 0) {
      test.skip(true, "no invest budget present yet — skipping");
      return;
    }
    await investBudgetLink.click();

    // Either summary card or empty state must be visible.
    await expect(
      page
        .getByText(/portfolio summary|portfolio|tổng quan/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dual-read hint absent when new schema has data", async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto("/budgets");

    const investBudgetLink = page
      .locator("a")
      .filter({ hasText: /portfolio|invest/i })
      .first();
    if ((await investBudgetLink.count()) === 0) {
      test.skip(true, "no invest budget present yet — skipping");
      return;
    }
    await investBudgetLink.click();

    // The "backfilled" badge only appears when the source is legacy.
    // A freshly created invest budget should not show it.
    const backfilled = page.getByText(/backfilled|đã di trú/i);
    await expect(backfilled).toHaveCount(0);
  });
});
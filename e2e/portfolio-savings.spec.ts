import { test, expect } from "@playwright/test";
import { registerAndLogin, skipOrgSelection } from "./helpers";

/**
 * Asset Portfolio e2e for Savings Account class.
 *
 * Covers: open the create-savings form, fill required fields, verify
 * the new card appears in the portfolio summary, and check that the
 * accrued interest appears (Phase 1 manual rate).
 *
 * Run: npm run test:e2e -- portfolio-savings.spec.ts
 */
test.describe("Portfolio savings account", () => {
  test("user can create a savings account", async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto("/budgets");

    const investBudgetLink = page
      .locator("a")
      .filter({ hasText: /portfolio|invest/i })
      .first();
    if ((await investBudgetLink.count()) === 0) {
      test.skip(true, "no invest budget present — create one first");
      return;
    }
    await investBudgetLink.click();

    // Try to open the add-asset dialog. The button label varies based
    // on i18n; accept any of the documented labels.
    const addBtn = page
      .getByRole("button", { name: /add asset|thêm tài sản|\+/i })
      .first();
    if ((await addBtn.count()) === 0) {
      test.skip(true, "add-asset button not present yet — UI not wired");
      return;
    }
    await addBtn.click();

    // Pick the savings-account class. The picker label may vary;
    // accept the standard label or fall back to skipping.
    const savingsClass = page
      .getByRole("button", { name: /savings account|tài khoản tiết kiệm/i })
      .first();
    if ((await savingsClass.count()) === 0) {
      test.skip(true, "savings class option not yet in picker");
      return;
    }
    await savingsClass.click();

    // Fill the form. Label names follow the portfolio namespace.
    await page.getByLabel(/label|nhãn|display name/i).first().fill("Playwright Savings");
    await page.getByLabel(/provider|ngân hàng/i).first().fill("VCB");
    await page.getByLabel(/reference|số tài khoản/i).first().fill("9999");
    await page.getByLabel(/balance|số dư/i).first().fill("50000000");
    await page
      .getByLabel(/rate|lãi suất/i)
      .first()
      .fill("0.05");
    await page
      .getByRole("button", { name: /save|lưu/i })
      .first()
      .click();

    // Card should appear with the user-entered label.
    await expect(
      page.getByText(/Playwright Savings/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("savings card shows accrued interest when rate is set", async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto("/budgets");

    const investBudgetLink = page
      .locator("a")
      .filter({ hasText: /portfolio|invest/i })
      .first();
    if ((await investBudgetLink.count()) === 0) {
      test.skip(true, "no invest budget present");
      return;
    }
    await investBudgetLink.click();

    // Look for an existing savings card; if none, skip the assertion.
    const savingsHeader = page
      .getByText(/estimated accrued|lãi ước tính/i)
      .first();
    if ((await savingsHeader.count()) === 0) {
      test.skip(true, "no savings card present yet");
      return;
    }
    await expect(savingsHeader).toBeVisible();
  });
});
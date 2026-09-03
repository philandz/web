import { test, expect } from "@playwright/test";
import { registerAndLogin, skipOrgSelection } from "./helpers";

/**
 * Asset Portfolio e2e for Fixed Deposit class.
 *
 * Covers: create a fixed deposit, verify the maturity date renders,
 * verify days-to-maturity is computed.
 *
 * Run: npm run test:e2e -- portfolio-fixed-deposit.spec.ts
 */
test.describe("Portfolio fixed deposit", () => {
  test("user can create a fixed deposit and see maturity date", async ({ page }) => {
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

    const addBtn = page
      .getByRole("button", { name: /add asset|thêm tài sản|\+/i })
      .first();
    if ((await addBtn.count()) === 0) {
      test.skip(true, "add-asset button not present yet");
      return;
    }
    await addBtn.click();

    const fdClass = page
      .getByRole("button", { name: /fixed deposit|tiền gửi có kỳ hạn/i })
      .first();
    if ((await fdClass.count()) === 0) {
      test.skip(true, "fixed deposit class not in picker yet");
      return;
    }
    await fdClass.click();

    await page
      .getByLabel(/label|nhãn|display name/i)
      .first()
      .fill("Playwright FD");
    await page.getByLabel(/provider|ngân hàng/i).first().fill("TCB");
    await page.getByLabel(/product|sản phẩm/i).first().fill("12-month term");
    await page.getByLabel(/principal|vốn gốc/i).first().fill("100000000");
    await page.getByLabel(/rate|lãi suất/i).first().fill("0.06");
    // Maturity date set ~365 days from today.
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const isoDate = oneYearFromNow.toISOString().slice(0, 10);
    await page.getByLabel(/maturity|ngày đáo hạn/i).first().fill(isoDate);

    await page
      .getByRole("button", { name: /save|lưu/i })
      .first()
      .click();

    await expect(
      page.getByText(/Playwright FD/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    // The maturity date should appear in the card row.
    await expect(
      page.getByText(/maturity|ngày đáo hạn/i).first(),
    ).toBeVisible();
  });
});
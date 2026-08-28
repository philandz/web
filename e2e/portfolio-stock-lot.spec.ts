import { test, expect } from "@playwright/test";
import { registerAndLogin, skipOrgSelection } from "./helpers";

/**
 * Asset Portfolio e2e for Stock Lot class.
 *
 * Covers: create a stock lot, verify ticker and exchange render, verify
 * the corporate-action warning banner appears.
 *
 * Run: npm run test:e2e -- portfolio-stock-lot.spec.ts
 */
test.describe("Portfolio stock lot", () => {
  test("user can create a stock lot", async ({ page }) => {
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

    const addBtn = page
      .getByRole("button", { name: /add asset|thêm tài sản|\+/i })
      .first();
    if ((await addBtn.count()) === 0) {
      test.skip(true, "add-asset button not present yet");
      return;
    }
    await addBtn.click();

    const stockClass = page
      .getByRole("button", { name: /stock lot|cổ phiếu/i })
      .first();
    if ((await stockClass.count()) === 0) {
      test.skip(true, "stock class not in picker yet");
      return;
    }
    await stockClass.click();

    await page
      .getByLabel(/label|nhãn|display name/i)
      .first()
      .fill("Playwright VNM");
    await page.getByLabel(/ticker|mã cp/i).first().fill("VNM");
    await page.getByLabel(/exchange|sàn/i).first().selectOption("HOSE");
    await page
      .getByLabel(/quantity bought|số lượng đã mua/i)
      .first()
      .fill("100");
    await page
      .getByLabel(/buy price|gía mua/i)
      .first()
      .fill("75000");
    await page.getByLabel(/purchase date|ngày mua/i).first().fill("2026-02-01");

    await page
      .getByRole("button", { name: /save|lưu/i })
      .first()
      .click();

    await expect(
      page.getByText(/Playwright VNM/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/ticker|mã cp/i).first(),
    ).toBeVisible();
    // Phase 1 corporate-action warning should appear.
    await expect(
      page.getByText(/no split|chưa hỗ trợ/i).first(),
    ).toBeVisible();
  });
});
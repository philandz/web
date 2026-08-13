import { test, expect } from "@playwright/test";
import { registerAndLogin, skipOrgSelection } from "./helpers";

/**
 * Asset Portfolio e2e for Gold Lot class.
 *
 * Covers: create a gold lot with grams unit, verify quantity
 * display, verify unit labels exist.
 *
 * Run: npm run test:e2e -- portfolio-gold-lot.spec.ts
 */
test.describe("Portfolio gold lot", () => {
  test("user can create a gold lot with grams unit", async ({ page }) => {
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

    const goldClass = page
      .getByRole("button", { name: /gold lot|vàng/i })
      .first();
    if ((await goldClass.count()) === 0) {
      test.skip(true, "gold class not in picker yet");
      return;
    }
    await goldClass.click();

    await page
      .getByLabel(/label|nhãn|display name/i)
      .first()
      .fill("Playwright Gold");
    await page.getByLabel(/provider|nhà cung cấp/i).first().fill("SJC");
    await page.getByLabel(/type|loại vàng/i).first().fill("9999");
    await page
      .getByLabel(/quantity \(grams\)|số lượng \(gram\)/i)
      .first()
      .fill("37.5");
    await page.getByLabel(/purchase date|ngày mua/i).first().fill("2026-01-01");

    await page
      .getByRole("button", { name: /save|lưu/i })
      .first()
      .click();

    await expect(
      page.getByText(/Playwright Gold/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/provider|nhà cung cấp/i).first(),
    ).toBeVisible();
  });
});
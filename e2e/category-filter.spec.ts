import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/**
 * Regression coverage for the Income-category bug.
 *
 * Reported symptom: opening Add from Income Categories and submitting
 * produced an Expense category because the frontend still sent the
 * legacy `cat_type` field while the Gateway/DB contract had moved to
 * `kind`.
 */

test.describe('Category kind filter', () => {
  test('Income category created via UI stays under Income after refresh', async ({ page }) => {
    test.setTimeout(60_000);
    const fixture = await createBudgetFixture(page, { budgetName: `E2E income kind ${Date.now()}` });
    await page.goto(`/budgets/${fixture.budgetId}?tab=categories`);
    await page.getByRole('button', { name: /filter/i }).first().click().catch(() => {});
    // Click Add inside the Income Categories section.
    const incomeSection = page.locator('section, div').filter({ hasText: /Income Categories/i }).first();
    await incomeSection.getByRole('button', { name: /add/i }).first().click();
    await page.locator('#name, input[name="name"]').first().fill('Bonus');
    await page.getByRole('button', { name: /add|save|create/i }).last().click();
    await expect(incomeSection.getByText('Bonus')).toBeVisible({ timeout: 10_000 });
    const expenseSection = page.locator('section, div').filter({ hasText: /Expense Categories/i }).first();
    await expect(expenseSection.getByText('Bonus')).toHaveCount(0);
    await page.reload();
    await expect(incomeSection.getByText('Bonus')).toBeVisible();
  });
});

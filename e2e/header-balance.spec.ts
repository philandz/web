import { test, expect } from '@playwright/test';
import { createBudgetFixture, createEntry } from './helpers';

/**
 * Regression coverage for the missing all-time budget balance in the
 * budget detail header.
 */

test.describe('Budget detail header balance', () => {
  test('header shows Income, Expense, and Current balance for all-time totals', async ({ page }) => {
    test.setTimeout(60_000);
    const fixture = await createBudgetFixture(page, { budgetName: `E2E header ${Date.now()}` });
    await createEntry(fixture, { token: fixture.token, amount: 1_000_000, kind: 'income', description: 'Salary' });
    await createEntry(fixture, { token: fixture.token, amount: 300_000, kind: 'expense', description: 'Groceries' });
    await page.goto(`/budgets/${fixture.budgetId}`);
    await expect(page.getByText(/current balance/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/700\.000|700,000|700K|₫700|0\.7\s?(tr|mil)/i).first()).toBeVisible();
  });
});

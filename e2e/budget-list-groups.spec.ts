import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/**
 * The budget list is a flat grid again (the type grouping the 2026-10-23 wave
 * introduced was removed). Every card shows the metric that belongs to its
 * budget type: a spending progress bar for standard budgets, the fund value
 * for saving budgets, my balance for sharing budgets.
 */
test.describe('Budget list', () => {
  test('renders a flat grid and no type groups', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Flat std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const mk = async (name: string, budget_type: string) => {
      const r = await f.api.post('/api/budget/budgets', {
        data: { org_id: f.orgId, name, budget_type, currency: 'VND' },
        headers: auth,
      });
      expect(r.status(), await r.text()).toBe(201);
    };
    await mk(`Flat save ${Date.now()}`, 'saving');
    await mk(`Flat share ${Date.now()}`, 'sharing');

    await page.goto('/budgets');
    await expect(page.getByText(/Flat std/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Flat save/).first()).toBeVisible();
    await expect(page.getByText(/Flat share/).first()).toBeVisible();

    // The grouping headers are gone.
    await expect(page.getByTestId('budget-group-standard')).toHaveCount(0);
    await expect(page.getByTestId('budget-group-saving')).toHaveCount(0);
    await expect(page.getByTestId('budget-group-sharing')).toHaveCount(0);
  });

  test('shows the metric that belongs to the budget type', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Metric std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const r = await f.api.post('/api/budget/budgets', {
      data: {
        org_id: f.orgId,
        name: `Metric save ${Date.now()}`,
        budget_type: 'saving',
        currency: 'VND',
      },
      headers: auth,
    });
    expect(r.status(), await r.text()).toBe(201);

    await page.goto('/budgets');
    const card = page.getByTestId('budget-card').filter({ hasText: 'Metric save' }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    // A fund has no spending limit: the card shows the fund value, not a
    // "spent / limit" progress bar.
    await expect(card.getByTestId('budget-card-fund-value')).toBeVisible();
    await expect(card.getByTestId('budget-card-spend-bar')).toHaveCount(0);
  });
});

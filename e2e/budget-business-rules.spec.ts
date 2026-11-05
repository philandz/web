import { test, expect } from '@playwright/test';
import { createBudgetFixture, createEntry } from './helpers';

/**
 * Saving and Sharing keep their own business rules (not the Standard ledger).
 * Runs against a stack with FEATURE_SAVING_FUND + FEATURE_SHARING_V2 on (backend)
 * and NEXT_PUBLIC_FEATURE_SAVING_FUND on (web).
 */
test.describe('Budget business rules per type', () => {
  test('saving fund page shows the fund, not the standard ledger', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Rules std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    await createEntry(f, { token: f.token, amount: 5_000_000, kind: 'income', description: 'Seed' });
    const sv = await f.api.post('/api/budget/budgets', {
      data: { org_id: f.orgId, name: `Rules fund ${Date.now()}`, budget_type: 'saving', currency: 'VND' },
      headers: auth,
    });
    const fundId: string = (await sv.json()).budget.base.id;
    const today = new Date().toISOString().split('T')[0];
    const dep = await f.api.post(`/api/portfolios/budgets/${fundId}/portfolio/fund/deposit`, {
      data: { budget_id: fundId, counterparty_budget_id: f.budgetId, amount_minor: 2_000_000, occurred_on: today, note: '', idempotency_key: `r-${Date.now()}` },
      headers: auth,
    });
    expect(dep.status(), await dep.text()).toBeLessThan(300);

    await page.goto(`/budgets/${fundId}`);
    const header = page.getByTestId('fund-header');
    await expect(header).toBeVisible({ timeout: 20_000 });
    await expect(header).toContainText('2.000.000');
    await expect(page.getByText(/spent this month/i)).toHaveCount(0);
    await expect(page.getByText(/over budget/i)).toHaveCount(0);
    await expect(page.getByText(/portfolio summary/i)).toHaveCount(0);
    await expect(page.getByTestId('fund-tabs').getByRole('tab')).toHaveCount(4);

    await page.getByTestId('fund-tabs').getByRole('tab', { name: /old history/i }).click();
    await expect(page.getByTestId('fund-legacy-history')).toBeVisible();
    await expect(page.getByTestId('add-transaction')).toHaveCount(0);
  });

  test('entries are refused on saving funds and sharing budgets', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Rules api ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    for (const type of ['saving', 'sharing']) {
      const r = await f.api.post('/api/budget/budgets', {
        data: { org_id: f.orgId, name: `Rules ${type} ${Date.now()}`, budget_type: type, currency: 'VND' },
        headers: auth,
      });
      const id: string = (await r.json()).budget.base.id;
      const e = await f.api.post('/api/entry/entries', {
        data: { budget_id: id, kind: 1, amount: 1000, description: 'x', entry_date: new Date().toISOString().split('T')[0] },
        headers: auth,
      });
      expect(e.status(), `${type}: ${await e.text()}`).toBe(412);
    }
  });

  test('sharing header shows the budget name; transactions page leaves sharing out', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Rules ledger ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const name = `Trip ${Date.now()}`;
    const r = await f.api.post('/api/budget/budgets', {
      data: { org_id: f.orgId, name, budget_type: 'sharing', currency: 'VND' },
      headers: auth,
    });
    const sharingId: string = (await r.json()).budget.base.id;

    await page.goto(`/sharing/${sharingId}`);
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 20_000 });

    await page.goto('/transactions');
    const picker = page.locator('select').first();
    await expect(picker).toBeVisible({ timeout: 20_000 });
    await expect(picker.locator('option', { hasText: 'Rules ledger' })).toHaveCount(1);
    await expect(picker.locator('option', { hasText: name })).toHaveCount(0);
  });
});

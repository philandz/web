import { test, expect } from '@playwright/test';
import { createBudgetFixture, createEntry } from './helpers';

/** Saving fund UI: add an investment paid from the cash pocket (R2 funding source). */
test.describe('Fund add holding', () => {
  test('a fixed deposit funded from the pocket lowers cash and raises holdings', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Fund UI src ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    await createEntry(f, { token: f.token, amount: 3_000_000, kind: 'income', description: 'Seed' });
    const sv = await f.api.post('/api/budget/budgets', {
      data: { org_id: f.orgId, name: `Fund UI ${Date.now()}`, budget_type: 'saving', currency: 'VND' },
      headers: auth,
    });
    const fundId: string = (await sv.json()).budget.base.id;
    const today = new Date().toISOString().split('T')[0];
    const dep = await f.api.post(`/api/portfolios/budgets/${fundId}/portfolio/fund/deposit`, {
      data: {
        budget_id: fundId,
        counterparty_budget_id: f.budgetId,
        amount_minor: 2_000_000,
        occurred_on: today,
        note: '',
        idempotency_key: `ui-dep-${Date.now()}`,
      },
      headers: auth,
    });
    expect(dep.status(), await dep.text()).toBeLessThan(300);

    await page.goto(`/budgets/${fundId}`);
    await expect(page.getByTestId('add-holding')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('add-holding').click();
    const form = page.getByTestId('add-holding-form');
    await form.locator('#holding-name').fill('E2E FD');
    await form.locator('#holding-provider').fill('VCB');
    await form.getByLabel('Amount input').fill('500000');
    await form.locator('#holding-rate').fill('6');
    const next = new Date(); next.setFullYear(next.getFullYear() + 1);
    await form.locator('#holding-maturity').fill(next.toISOString().split('T')[0]);
    await form.getByRole('button', { name: /^add$/i }).click();

    await expect(page.getByTestId('add-holding-form')).toHaveCount(0, { timeout: 15_000 });
    await expect
      .poll(async () => {
        const r = await f.api.get(`/api/portfolios/budgets/${fundId}/portfolio/fund`, { headers: auth });
        const s = await r.json();
        return `${s.cash_balance}/${s.holdings_value}`;
      }, { timeout: 15_000 })
      .toBe('1500000/500000');
  });
});

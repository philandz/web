import { test, expect } from '@playwright/test';
import { createBudgetFixture, createEntry } from './helpers';

/**
 * Saving fund cash pocket (R2). Needs FEATURE_SAVING_FUND on the entry and
 * budget services (set in the local stack).
 */
test.describe('Saving fund', () => {
  test('deposit and withdraw move cash, withdraw cannot overdraw', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Fund src ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    await createEntry(f, { token: f.token, amount: 2_000_000, kind: 'income', description: 'Seed' });

    const sv = await f.api.post('/api/budget/budgets', {
      data: { org_id: f.orgId, name: `Fund ${Date.now()}`, budget_type: 'saving', currency: 'VND' },
      headers: auth,
    });
    expect(sv.status(), await sv.text()).toBe(201);
    const sb = await sv.json();
    const fundId: string = sb.budget?.base?.id ?? sb.base?.id;
    const today = new Date().toISOString().split('T')[0];

    const dep = await f.api.post(`/api/portfolios/budgets/${fundId}/portfolio/fund/deposit`, {
      data: {
        budget_id: fundId,
        counterparty_budget_id: f.budgetId,
        amount_minor: 500_000,
        occurred_on: today,
        note: 'pw deposit',
        idempotency_key: `pw-dep-${Date.now()}`,
      },
      headers: auth,
    });
    expect(dep.status(), await dep.text()).toBeLessThan(300);

    const sum = await f.api.get(`/api/portfolios/budgets/${fundId}/portfolio/fund`, { headers: auth });
    expect(sum.status(), await sum.text()).toBe(200);
    const s = await sum.json();
    expect(Number(s.cash_balance)).toBe(500_000);
    expect(Number(s.net_contributed)).toBe(500_000);

    const wd = await f.api.post(`/api/portfolios/budgets/${fundId}/portfolio/fund/withdraw`, {
      data: {
        budget_id: fundId,
        counterparty_budget_id: f.budgetId,
        amount_minor: 200_000,
        occurred_on: today,
        note: '',
        idempotency_key: `pw-wd-${Date.now()}`,
      },
      headers: auth,
    });
    expect(wd.status(), await wd.text()).toBeLessThan(300);

    const over = await f.api.post(`/api/portfolios/budgets/${fundId}/portfolio/fund/withdraw`, {
      data: {
        budget_id: fundId,
        counterparty_budget_id: f.budgetId,
        amount_minor: 9_000_000,
        occurred_on: today,
        note: '',
        idempotency_key: `pw-over-${Date.now()}`,
      },
      headers: auth,
    });
    expect(over.status()).toBeGreaterThanOrEqual(400);
    expect(over.status()).toBeLessThan(500);

    const after = await (await f.api.get(`/api/portfolios/budgets/${fundId}/portfolio/fund`, { headers: auth })).json();
    expect(Number(after.cash_balance)).toBe(300_000);
  });

  test('manual income/expense is rejected on a fund', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Fund guard ${Date.now()}`, budgetType: 'saving' });
    const res = await f.api.post('/api/entry/entries', {
      data: {
        budget_id: f.budgetId,
        kind: 2,
        amount: 1000,
        description: 'manual',
        entry_date: new Date().toISOString().split('T')[0],
      },
      headers: { Authorization: `Bearer ${f.token}` },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

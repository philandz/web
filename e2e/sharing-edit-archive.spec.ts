import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/** Sharing budgets: edit an expense (full replace) and archive/reopen (R4). */
test.describe('Sharing edit + archive', () => {
  test('edit expense keeps balances consistent; archive blocks writes (412); reopen restores', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Share ${Date.now()}`, budgetType: 'sharing' });
    const auth = { Authorization: `Bearer ${f.token}` };
    const today = new Date().toISOString().split('T')[0];
    const body = (total: number, desc: string) => ({
      paid_by: f.userId,
      total_amount: total,
      description: desc,
      expense_date: today,
      split_method: 2,
      legs: [{ user_id: f.userId, amount: total, weight: 0 }],
    });

    const add = await f.api.post(`/api/sharing/budgets/${f.budgetId}/expenses`, { data: body(100_000, 'Dinner'), headers: auth });
    expect(add.status(), await add.text()).toBeLessThan(300);
    const created = await add.json();
    const expenseId: string = created.id ?? created.expense?.id ?? created.base?.id;
    expect(expenseId, JSON.stringify(created).slice(0, 200)).toBeTruthy();

    const upd = await f.api.patch(`/api/sharing/expenses/${expenseId}`, { data: body(150_000, 'Dinner + drinks'), headers: auth });
    expect(upd.status(), await upd.text()).toBeLessThan(300);
    const updated = await upd.json();
    expect(JSON.stringify(updated)).toContain('Dinner + drinks');

    const list = await (await f.api.get(`/api/sharing/budgets/${f.budgetId}/expenses`, { headers: auth })).json();
    const rows = list.expenses ?? list.items ?? list;
    expect(Array.isArray(rows) ? rows.length : 0).toBe(1);

    const arch = await f.api.post(`/api/sharing/budgets/${f.budgetId}/archive`, { data: {}, headers: auth });
    expect(arch.status(), await arch.text()).toBeLessThan(300);

    const blocked = await f.api.post(`/api/sharing/budgets/${f.budgetId}/expenses`, { data: body(1000, 'nope'), headers: auth });
    expect(blocked.status()).toBe(412);
    const blockedEdit = await f.api.patch(`/api/sharing/expenses/${expenseId}`, { data: body(2000, 'nope'), headers: auth });
    expect(blockedEdit.status()).toBe(412);

    const reopen = await f.api.post(`/api/sharing/budgets/${f.budgetId}/reopen`, { data: {}, headers: auth });
    expect(reopen.status(), await reopen.text()).toBeLessThan(300);
    const ok = await f.api.post(`/api/sharing/budgets/${f.budgetId}/expenses`, { data: body(1000, 'back'), headers: auth });
    expect(ok.status(), await ok.text()).toBeLessThan(300);
  });
});

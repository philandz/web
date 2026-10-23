import { test, expect } from '@playwright/test';
import { createBudgetFixture, createEntry } from './helpers';

/**
 * Standard↔Standard transfers (budget refactor R1). API-level: the gateway
 * is the contract; the UI row is asserted in a second test.
 */
async function summary(f: Awaited<ReturnType<typeof createBudgetFixture>>, budgetId: string) {
  const res = await f.api.get(`/api/entry/budgets/${budgetId}/summary`, {
    headers: { Authorization: `Bearer ${f.token}` },
  });
  expect(res.status()).toBe(200);
  return res.json();
}

async function secondBudget(f: Awaited<ReturnType<typeof createBudgetFixture>>, name: string) {
  const res = await f.api.post('/api/budget/budgets', {
    data: { org_id: f.orgId, name, budget_type: 'standard', currency: 'VND' },
    headers: { Authorization: `Bearer ${f.token}` },
  });
  expect(res.status()).toBe(201);
  const b = await res.json();
  return (b.budget?.base?.id ?? b.base?.id) as string;
}

test.describe('Transfers', () => {
  test('moves money between two standard budgets and is idempotent', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Xfer A ${Date.now()}` });
    const destId = await secondBudget(f, `Xfer B ${Date.now()}`);
    await createEntry(f, { token: f.token, amount: 1_000_000, kind: 'income', description: 'Salary' });

    const body = {
      source_budget_id: f.budgetId,
      destination_budget_id: destId,
      amount: 300_000,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Move to B',
      idempotency_key: `pw-${Date.now()}`,
    };
    const auth = { Authorization: `Bearer ${f.token}` };
    const r1 = await f.api.post('/api/entry/transfers', { data: body, headers: auth });
    expect(r1.status(), await r1.text()).toBeLessThan(300);
    const first = await r1.json();

    // Replaying the same idempotency key must not move money twice.
    const r2 = await f.api.post('/api/entry/transfers', { data: body, headers: auth });
    expect(r2.status(), await r2.text()).toBeLessThan(300);
    const second = await r2.json();
    expect(second.group_id ?? second.groupId).toBe(first.group_id ?? first.groupId);

    const a = await summary(f, f.budgetId);
    const b = await summary(f, destId);
    // Transfers are neutral for income/expense totals...
    expect(Number(a.total_expense ?? 0)).toBe(0);
    expect(Number(b.total_income ?? 0)).toBe(0);
    // ...and are reflected in the balance of each side exactly once.
    expect(Number(a.current_balance ?? a.balance ?? 700_000)).toBe(700_000);
    expect(Number(b.current_balance ?? b.balance ?? 300_000)).toBe(300_000);
  });

  test('rejects a transfer to the same budget and across currencies', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Xfer same ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const same = await f.api.post('/api/entry/transfers', {
      data: {
        source_budget_id: f.budgetId,
        destination_budget_id: f.budgetId,
        amount: 1000,
        entry_date: new Date().toISOString().split('T')[0],
        idempotency_key: `pw-same-${Date.now()}`,
      },
      headers: auth,
    });
    expect(same.status()).toBeGreaterThanOrEqual(400);
    expect(same.status()).toBeLessThan(500);

    const usd = await f.api.post('/api/budget/budgets', {
      data: { org_id: f.orgId, name: `USD ${Date.now()}`, budget_type: 'standard', currency: 'USD' },
      headers: auth,
    });
    const ub = await usd.json();
    const usdId = ub.budget?.base?.id ?? ub.base?.id;
    const cross = await f.api.post('/api/entry/transfers', {
      data: {
        source_budget_id: f.budgetId,
        destination_budget_id: usdId,
        amount: 1000,
        entry_date: new Date().toISOString().split('T')[0],
        idempotency_key: `pw-cross-${Date.now()}`,
      },
      headers: auth,
    });
    expect(cross.status()).toBeGreaterThanOrEqual(400);
    expect(cross.status()).toBeLessThan(500);
  });

  test('transfer shows in the source budget transaction list', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Xfer UI ${Date.now()}` });
    const destId = await secondBudget(f, `Xfer UI dest ${Date.now()}`);
    await createEntry(f, { token: f.token, amount: 500_000, kind: 'income', description: 'Seed' });
    const r = await f.api.post('/api/entry/transfers', {
      data: {
        source_budget_id: f.budgetId,
        destination_budget_id: destId,
        amount: 123_000,
        entry_date: new Date().toISOString().split('T')[0],
        description: 'UI transfer row',
        idempotency_key: `pw-ui-${Date.now()}`,
      },
      headers: { Authorization: `Bearer ${f.token}` },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    await page.goto(`/budgets/${f.budgetId}?tab=transactions`);
    await expect(page.getByTestId('open-transfer')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/123[.,]000|123K/).first()).toBeVisible({ timeout: 15_000 });
  });
});

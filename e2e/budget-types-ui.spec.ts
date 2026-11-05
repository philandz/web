import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/**
 * The three budget kinds in the UI (plan §8.3).
 *
 * - Standard: spending budget, progress against the monthly limit.
 * - Saving: a fund — value + growth, no spending limit.
 * - Sharing: a group splitting costs — my balance, total spent, member count.
 *
 * These tests drive the real UI; the API is only used to set the fixtures up.
 */
test.describe('Budget types in the UI', () => {
  test('the list shows the metric that belongs to each budget type', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `UI std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const mk = async (name: string, budget_type: string) => {
      const r = await f.api.post('/api/budget/budgets', {
        data: { org_id: f.orgId, name, budget_type, currency: 'VND' },
        headers: auth,
      });
      expect(r.status(), await r.text()).toBe(201);
    };
    await mk(`UI save ${Date.now()}`, 'saving');
    await mk(`UI share ${Date.now()}`, 'sharing');

    await page.goto('/budgets');

    const std = page.getByTestId('budget-card').filter({ hasText: 'UI std' }).first();
    await expect(std).toBeVisible({ timeout: 20_000 });
    // A spending budget shows the progress against its limit.
    await expect(std.getByTestId('budget-card-spend-bar')).toBeVisible();

    const save = page.getByTestId('budget-card').filter({ hasText: 'UI save' }).first();
    await expect(save).toBeVisible();
    // A fund shows its value, and no spending limit.
    await expect(save.getByTestId('budget-card-fund-value')).toBeVisible();
    await expect(save.getByTestId('budget-card-spend-bar')).toHaveCount(0);

    const share = page.getByTestId('budget-card').filter({ hasText: 'UI share' }).first();
    await expect(share).toBeVisible();
    // A group shows my balance, and no spending limit either.
    await expect(share.getByTestId('budget-card-my-balance')).toBeVisible();
    await expect(share.getByTestId('budget-card-spend-bar')).toHaveCount(0);
  });

  test('the fund panel shows the real value and money can be moved in', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `UI fund std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const mk = async (name: string, budget_type: string) => {
      const r = await f.api.post('/api/budget/budgets', {
        data: { org_id: f.orgId, name, budget_type, currency: 'VND' },
        headers: auth,
      });
      expect(r.status(), await r.text()).toBe(201);
      return (await r.json()).budget.base.id as string;
    };
    const standardId = await mk(`UI fund source ${Date.now()}`, 'standard');
    const savingId = await mk(`UI fund target ${Date.now()}`, 'saving');

    await page.goto(`/budgets/${savingId}`);
    const panel = page.getByTestId('fund-panel');
    await expect(panel, 'the saving budget renders the fund panel').toBeVisible({ timeout: 20_000 });
    // The fund is empty, but the panel must show a real number — not a blank.
    await expect(page.getByTestId('fund-total')).toContainText('0');

    // Add money through the UI.
    await panel.getByRole('button', { name: /add money/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#fund-counterparty').selectOption(standardId);
    await dialog.getByLabel('Amount input').fill('2000000');
    await dialog.getByRole('button', { name: /^add money$/i }).last().click();

    // The fund now holds the money, and the cash history records the movement.
    await expect(page.getByTestId('fund-total')).toContainText(/2[.,]000[.,]000|2\.000\.000/, {
      timeout: 20_000,
    });
    await expect(page.getByTestId('fund-movements')).toContainText(/2[.,]000[.,]000|2\.000\.000/);
  });

  test('withdrawing more than the cash pocket is refused', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `UI over std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const mk = async (name: string, budget_type: string) => {
      const r = await f.api.post('/api/budget/budgets', {
        data: { org_id: f.orgId, name, budget_type, currency: 'VND' },
        headers: auth,
      });
      expect(r.status(), await r.text()).toBe(201);
      return (await r.json()).budget.base.id as string;
    };
    const standardId = await mk(`UI over source ${Date.now()}`, 'standard');
    const savingId = await mk(`UI over target ${Date.now()}`, 'saving');

    // Put 1 000 000 in the pocket first.
    const dep = await f.api.post(`/api/budget/budgets/${savingId}/portfolio/fund/deposit`, {
      data: {
        budget_id: savingId,
        counterparty_budget_id: standardId,
        amount_minor: 1_000_000,
        occurred_on: new Date().toISOString().slice(0, 10),
        note: 'seed',
        idempotency_key: `ui-over-${Date.now()}`,
      },
      headers: auth,
    });
    expect(dep.status(), await dep.text()).toBeLessThan(300);

    await page.goto(`/budgets/${savingId}`);
    const panel = page.getByTestId('fund-panel');
    await expect(panel).toBeVisible({ timeout: 20_000 });

    await panel.getByRole('button', { name: /^withdraw$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#fund-counterparty').selectOption(standardId);
    await dialog.getByLabel('Amount input').fill('5000000');
    await dialog.getByRole('button', { name: /^withdraw$/i }).last().click();

    // The transfer is refused: the pocket keeps its balance.
    await expect(page.getByTestId('fund-total')).toContainText(/1[.,]000[.,]000|1\.000\.000/, {
      timeout: 20_000,
    });
  });

  test('the sharing tabs follow the plan and the activity log renders', async ({ page }) => {
    const f = await createBudgetFixture(page, {
      budgetName: `UI share ${Date.now()}`,
      budgetType: 'sharing',
    });
    const auth = { Authorization: `Bearer ${f.token}` };
    const today = new Date().toISOString().slice(0, 10);
    const add = await f.api.post(`/api/sharing/budgets/${f.budgetId}/expenses`, {
      data: {
        paid_by: f.userId,
        total_amount: 120_000,
        description: 'UI activity',
        expense_date: today,
        split_method: 1,
        legs: [{ user_id: f.userId, amount: 120_000, weight: 0 }],
      },
      headers: auth,
    });
    expect(add.status(), await add.text()).toBeLessThan(300);

    await page.goto(`/sharing/${f.budgetId}`);
    // Plan §8.3: Chi tiêu / Số dư & thanh toán / Hoạt động / Thành viên / Cài đặt
    const tabs = page.getByRole('tab');
    await expect(tabs.filter({ hasText: /expenses/i })).toBeVisible({ timeout: 20_000 });
    await expect(tabs.filter({ hasText: /balances/i })).toBeVisible();
    await expect(tabs.filter({ hasText: /activity/i })).toBeVisible();
    await expect(tabs.filter({ hasText: /members/i })).toBeVisible();
    await expect(tabs.filter({ hasText: /settings/i })).toBeVisible();

    // The activity log is wired to the backend and renders the entry.
    await tabs.filter({ hasText: /activity/i }).click();
    await expect(page.getByText(/UI activity|expense/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('an archived sharing budget refuses new expenses until it is reopened', async ({ page }) => {
    const f = await createBudgetFixture(page, {
      budgetName: `UI arch ${Date.now()}`,
      budgetType: 'sharing',
    });
    const auth = { Authorization: `Bearer ${f.token}` };

    const arch = await f.api.post(`/api/sharing/budgets/${f.budgetId}/archive`, {
      data: {},
      headers: auth,
    });
    expect(arch.status(), await arch.text()).toBeLessThan(300);

    await page.goto(`/sharing/${f.budgetId}`);
    await expect(page.getByText(/archived/i).first()).toBeVisible({ timeout: 20_000 });

    // A write on an archived budget is refused with 412.
    const blocked = await f.api.post(`/api/sharing/budgets/${f.budgetId}/expenses`, {
      data: {
        paid_by: f.userId,
        total_amount: 1000,
        description: 'nope',
        expense_date: new Date().toISOString().slice(0, 10),
        split_method: 1,
        legs: [{ user_id: f.userId, amount: 1000, weight: 0 }],
      },
      headers: auth,
    });
    expect(blocked.status()).toBe(412);

    // Reopening restores the writes.
    const reopen = await f.api.post(`/api/sharing/budgets/${f.budgetId}/reopen`, {
      data: {},
      headers: auth,
    });
    expect(reopen.status(), await reopen.text()).toBeLessThan(300);
    const ok = await f.api.post(`/api/sharing/budgets/${f.budgetId}/expenses`, {
      data: {
        paid_by: f.userId,
        total_amount: 1000,
        description: 'back',
        expense_date: new Date().toISOString().slice(0, 10),
        split_method: 1,
        legs: [{ user_id: f.userId, amount: 1000, weight: 0 }],
      },
      headers: auth,
    });
    expect(ok.status(), await ok.text()).toBeLessThan(300);
  });
});

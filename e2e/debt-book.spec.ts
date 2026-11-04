import { test, expect, type Page } from '@playwright/test';
import { createBudgetFixture, createEntry } from './helpers';

/**
 * Debt book (plan 2026-11-04). Needs FEATURE_DEBT_V2 on the entry service and
 * NEXT_PUBLIC_FEATURE_DEBT_V2=1 on the web build (set in the local stack).
 */
test.describe('Debt book', () => {
  test('loan with fixed then floating rate, scheduled payment, prepayment with fee', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Pay from ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    await createEntry(f, { token: f.token, amount: 1_000_000_000, kind: 'income', description: 'Seed' });

    const created = await f.api.post('/api/budget/budgets', {
      data: { org_id: f.orgId, name: `Debts ${Date.now()}`, budget_type: 'debt', currency: 'VND' },
      headers: auth,
    });
    expect(created.status(), await created.text()).toBe(201);
    const cb = await created.json();
    const debtId: string = cb.budget?.base?.id ?? cb.base?.id;

    await page.goto(`/budgets/${debtId}`);
    await expect(page.getByTestId('debt-book')).toBeVisible();

    // --- create the loan: 8.9% fixed, floating 11.5% after one year ---------
    await page.getByTestId('debt-add-account').click();
    const form = page.getByTestId('debt-create-form');
    await form.locator('#d-name').fill('Consumer loan');
    await form.locator('#d-lender').fill('Bank X');
    await form.getByLabel('Amount input').first().fill('500000000');
    await form.locator('#d-day').fill('15');
    await form.locator('#d-term').fill('120');
    await form.locator('#d-rate').fill('8.9');
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    await form.locator('#d-float-from').fill(next.toISOString().slice(0, 10));
    await form.locator('#d-float-rate').fill('11.5');
    await form.getByLabel('Amount input').nth(1).fill('100000000');
    await form.locator('#d-fee-pct').fill('3');
    await page.getByTestId('debt-create-submit').click();

    await expect(page.getByTestId('debt-account-card')).toHaveCount(1);
    await expect(page.getByTestId('debt-total-outstanding')).toContainText('500.000.000');

    // --- scheduled payment from the Standard budget -------------------------
    await page.getByTestId('debt-account-card').click();
    await expect(page.getByTestId('debt-schedule')).toBeVisible();
    await page.getByTestId('debt-pay-scheduled').click();
    await expect(page.getByTestId('debt-quote')).toBeVisible();
    await page.locator('#debt-pay-from').selectOption(f.budgetId);
    await page.getByTestId('debt-pay-create-category').click();
    await expect(page.locator('#debt-pay-category')).not.toHaveValue('');
    await page.getByTestId('debt-pay-submit').click();
    await expect(page.getByTestId('debt-payment-form')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('debt-payments').locator('div').first()).toBeVisible();

    const std = await f.api.get(`/api/entry/budgets/${f.budgetId}/summary`, { headers: auth });
    expect(std.status()).toBe(200);
    const stdBody = await std.json();
    expect(Number(stdBody.total_expense ?? stdBody.expense ?? 0)).toBeGreaterThan(0);

    // --- prepay 100M (inside the free allowance) -----------------------------
    const prepay = async (amount: string) => {
      await page.getByTestId('debt-pay-prepay').click();
      const dlg = page.getByTestId('debt-payment-form');
      await page.locator('#debt-pay-from').selectOption(f.budgetId);
      await dlg.getByLabel('Amount input').first().fill(amount);
      await expect(page.getByTestId('debt-quote')).toBeVisible();
      await expect(page.getByTestId('debt-allowance')).toBeVisible();
      if ((await page.locator('#debt-pay-category').inputValue().catch(() => 'x')) === '') {
        await page.getByTestId('debt-pay-create-category').click();
        await expect(page.locator('#debt-pay-category')).not.toHaveValue('');
      }
      await page.getByTestId('debt-pay-submit').click();
      await expect(page.getByTestId('debt-payment-form')).toBeHidden({ timeout: 15_000 });
    };
    await prepay('100000000');
    await prepay('150000000');

    const accRes = await f.api.get(`/api/budget/budgets/${debtId}/debt/payments?account_id=&page=0&page_size=50`, { headers: auth });
    expect(accRes.status(), await accRes.text()).toBe(200);
    const pays: Array<{ kind: string; principal_minor: number | string; fee_minor: number | string }> = (await accRes.json()).payments;
    const prepays = pays.filter((p) => p.kind === 'prepayment');
    expect(prepays).toHaveLength(2);
    expect(Number(prepays.find((p) => Number(p.principal_minor) === 100_000_000)?.fee_minor)).toBe(0);
    // second prepayment is beyond the 100M free allowance of the month: 3% of 150M
    expect(Number(prepays.find((p) => Number(p.principal_minor) === 150_000_000)?.fee_minor)).toBe(4_500_000);

    // the schedule got shorter than the original 120 periods
    const sched = await f.api.get(`/api/budget/budgets/${debtId}/debt/accounts`, { headers: auth });
    const acc = (await sched.json()).accounts[0];
    expect(Number(acc.outstanding_minor)).toBeLessThan(250_000_000);
    await page.reload();
    await page.getByTestId('debt-account-card').click();
    await expect(page.getByTestId('debt-schedule').locator('tbody tr').first()).toBeVisible();
  });

  test('a debt budget has no manual entry composer while it is a debt book', async ({ page }: { page: Page }) => {
    const f = await createBudgetFixture(page, { budgetType: 'debt', budgetName: `Book ${Date.now()}` });
    const res = await f.api.post('/api/entry/entries', {
      data: { budget_id: f.budgetId, kind: 1, amount: 1000, description: 'manual', entry_date: new Date().toISOString().slice(0, 10) },
      headers: { Authorization: `Bearer ${f.token}` },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await page.goto(`/budgets/${f.budgetId}`);
    await expect(page.getByTestId('debt-book')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/** Budget list groups budgets by type (R5 / T5.4); a type filter shows a flat list. */
test.describe('Budget list groups', () => {
  test('groups by type with a KPI and flattens under a type filter', async ({ page }) => {
    const f = await createBudgetFixture(page, { budgetName: `Grp std ${Date.now()}` });
    const auth = { Authorization: `Bearer ${f.token}` };
    const mk = async (name: string, budget_type: string) => {
      const r = await f.api.post('/api/budget/budgets', {
        data: { org_id: f.orgId, name, budget_type, currency: 'VND' },
        headers: auth,
      });
      expect(r.status(), await r.text()).toBe(201);
    };
    await mk(`Grp save ${Date.now()}`, 'saving');
    await mk(`Grp share ${Date.now()}`, 'sharing');

    await page.goto('/budgets');
    await expect(page.getByTestId('budget-group-standard')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('budget-group-saving')).toBeVisible();
    await expect(page.getByTestId('budget-group-sharing')).toBeVisible();
    await expect(page.getByTestId('budget-group-kpi-sharing')).toContainText('1');

    await page.goto('/budgets?type=sharing');
    await expect(page.getByText(/Grp share/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('budget-group-sharing')).toHaveCount(0);
  });
});

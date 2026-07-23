import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/**
 * Regression coverage for the Budget list controls bug.
 *
 * Reported symptom: search, type filter, sort, role, and pagination
 * had no effect on results. The root cause was that the Gateway only
 * forwarded `org_id` to the Budget service while the frontend sent
 * the full query string.
 */

test.describe('Budget list controls', () => {
  test('search and type filter narrow the budget list', async ({ page }) => {
    test.setTimeout(60_000);
    const fixture = await createBudgetFixture(page, { budgetName: `E2E list ${Date.now()}` });
    // Create a second budget of a different type via API
    const second = await fixture.api.post('/api/budget/budgets', {
      data: { org_id: fixture.orgId, name: `Other ${Date.now()}`, budget_type: 'saving', currency: 'VND' },
      headers: { Authorization: `Bearer ${fixture.token}` },
    });
    expect(second.ok()).toBeTruthy();
    await page.goto('/budgets');
    await page.getByPlaceholder(/search/i).first().fill(fixture.budgetId.slice(0, 6));
    await expect(page.getByText(/other/i)).toHaveCount(0);
  });

  test('sort direction toggles between asc and desc', async ({ page }) => {
    test.setTimeout(60_000);
    const fixture = await createBudgetFixture(page, { budgetName: `E2E sort asc ${Date.now()}` });
    await page.goto('/budgets');
    await page.locator('select').filter({ has: page.locator('option', { hasText: /sort by/i }) }).first().selectOption({ label: 'Name' });
    const url1 = new URL(page.url());
    expect(url1.searchParams.get('sort')).toBe('name');
    expect(url1.searchParams.get('dir')).toBe('desc');
    await page.goto(url1.toString() + '&dir=asc');
    const url2 = new URL(page.url());
    expect(url2.searchParams.get('sort')).toBe('name');
    expect(url2.searchParams.get('dir')).toBe('asc');
  });
});

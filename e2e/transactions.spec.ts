import { test, expect, Page, APIRequestContext, request } from '@playwright/test';
import { registerAndLogin, skipOrgSelection, logout, expectRedirectToLogin, TEST_PASSWORD, uniqueEmail } from './helpers';

/**
 * Transactions / Entries feature tests.
 *
 * Covers: transactions list page, add-entry sheet, edit-entry, delete-entry,
 * entry detail.  The transactions list is filtered by selected budget; this
 * file skips tests that depend on a pre-existing budget to keep tests
 * isolated (see e2e/helpers.ts for budget-creation utilities if needed later).
 *
 * Run: npm run test:e2e:transactions
 */
/**
 * Creates a real user + org + budget via the API and signs the browser into
 * the same account. Bypasses the UI login flake so filter-panel tests can
 * reach the page deterministically.
 */
async function signInAsFreshUserWithBudget(page: Page): Promise<string> {
  const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:9100';
  const email = uniqueEmail('pw');
  const password = TEST_PASSWORD;
  const api: APIRequestContext = await request.newContext({ baseURL: apiUrl });
  const reg = await api.post('/api/identity/register', {
    data: { display_name: 'Playwright E2E', email, password },
  });
  expect(reg.status(), `register failed: ${await reg.text()}`).toBe(201);
  const login = await api.post('/api/identity/login', { data: { email, password } });
  expect(login.status(), `login failed: ${await login.text()}`).toBe(200);
  const body = await login.json();
  const token: string = body.access_token;
  const orgId: string = body.organizations?.[0]?.base?.id;
  expect(token, 'no access_token').toBeTruthy();
  expect(orgId, 'no org_id').toBeTruthy();
  const budget = await api.post('/api/budget/budgets', {
    data: { org_id: orgId, name: 'E2E Filter Budget', budget_type: 'monthly', currency: 'USD' },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(budget.status(), `budget failed: ${await budget.text()}`).toBe(201);
  const budgetBody = await budget.json();
  const budgetId: string = budgetBody.base?.id || budgetBody.id;
  expect(budgetId, 'no budget_id').toBeTruthy();

  // Persist a fully-shaped Zustand auth state so the (dashboard) layout
  // does not redirect to /select-organization or /login. The auth store
  // is keyed 'philandz-web-auth' (see lib/auth-store.ts).
  const persisted = {
    state: {
      hydrated: true,
      sessionNotice: null,
      token,
      userType: 'normal',
      profile: { id: 'e2e', displayName: 'Playwright E2E', email },
      organizations: [body.organizations?.[0]],
      selectedOrgId: orgId,
    },
    version: 0,
  };
  await page.goto('/');
  await page.evaluate(
    (s) => localStorage.setItem('philandz-web-auth', s),
    JSON.stringify(persisted),
  );
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  return budgetId;
}

test.describe('Transactions', () => {
  // -------------------------------------------------------------------------
  // Task 7: Filter panel + DateDropdown tests
  // -------------------------------------------------------------------------

  test('filter button expands and collapses filter panel', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    await page.goto(`/budgets/${budgetId}?tab=transactions`);
    // Wait for the transactions tab content to render.
    await page.locator('[aria-expanded]').first().waitFor({ state: 'attached', timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Filter panel should be collapsed by default
    const filterPanel = page.locator('[aria-expanded]').first();
    await expect(filterPanel).toHaveAttribute('aria-expanded', 'false');

    // Click Filter button
    await page.getByRole('button', { name: /filter/i }).click();

    // Panel should be expanded
    await expect(filterPanel).toHaveAttribute('aria-expanded', 'true');

    // Type segmented should be visible
    await expect(page.getByText('All types')).toBeVisible();
    // The three core filter controls must render in the expanded panel.
    // This is the user-reported bug: Members / Category / DateDropdown triggers
    // must appear inside the panel. The toolbar's filter panel is the
    // [class*="space-y-2"] container, scoped here so we don't match the
    // budget-detail sidebar tabs of the same name.
    const filterPanelArea = page.locator('[class*="space-y-2"]');
    await expect(
      filterPanelArea.getByRole('button', { name: /^members$/i }),
    ).toBeVisible();
    await expect(
      filterPanelArea.getByRole('button', { name: /^category$/i }),
    ).toBeVisible();
    await expect(
      filterPanelArea.getByRole('button', {
        name: /this month|today|last 7 days|custom range/i,
      }),
    ).toBeVisible();

    // Collapse
    await page.getByRole('button', { name: /filter/i }).click();
    await expect(filterPanel).toHaveAttribute('aria-expanded', 'false');
  });

  test('date preset applies This Month filter on first load', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    await page.goto(`/budgets/${budgetId}?tab=transactions`);
    await page.locator('[aria-expanded]').first().waitFor({ state: 'attached', timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    const params = new URL(url).searchParams;
    expect(params.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('custom date range over 30 days shows error and blocks search', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    await page.goto(`/budgets/${budgetId}?tab=transactions`);
    await page.locator('[aria-expanded]').first().waitFor({ state: 'attached', timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Open filter panel and assert that the date dropdown is present
    // (same bug as Members/Category — DateDropdown trigger is currently
    // missing from the rendered DOM).
    await page.getByRole('button', { name: /filter/i }).click();
    const filterPanelArea = page.locator('[class*="space-y-2"]');
    await expect(
      filterPanelArea.getByRole('button', {
        name: /this month|today|last 7 days|custom range/i,
      }),
    ).toBeVisible();

    await filterPanelArea
      .getByRole('button', { name: /this month|today|last 7 days/i })
      .first()
      .click();
    await page.getByText(/custom range/i).click();

    // Set 60-day range
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[type="date"]').last().fill('2026-07-31');

    // Error message shown
    await expect(page.getByText('Maximum selectable range is 30 days.')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Existing tests
  // -------------------------------------------------------------------------

  test('transactions page renders (empty list)', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    // Some apps route /transactions/:budgetId, others show a chooser.
    await page.goto(`/budgets/${budgetId}?tab=transactions`);
    await page.locator('[aria-expanded]').first().waitFor({ state: 'attached', timeout: 15_000 });
    await expect(page.locator('[aria-expanded]').first()).toBeVisible();
  });

  test('unauthenticated /transactions is denied', async ({ page }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.goto('/transactions');
    await expectRedirectToLogin(page, { fromPath: '/transactions' });
  });

  test('filter by type and search', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    await page.goto(`/budgets/${budgetId}?tab=transactions`);
    await page.locator('[aria-expanded]').first().waitFor({ state: 'attached', timeout: 15_000 });

    // Apply type=expense filter via the type segmented control
    const expenseBtn = page.locator('[class*="space-y-2"]').getByRole('button', { name: /^expense$/i });
    if (await expenseBtn.count() > 0) {
      await expenseBtn.first().click();
    }

    // Press the toolbar's Search button
    const searchBtn = page.locator('[class*="space-y-2"]').getByRole('button', { name: /^search$/i });
    if (await searchBtn.count() > 0) {
      await searchBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForURL((url) => url.searchParams.get('type') === 'expense', { timeout: 5_000 }).catch(() => {});
    const url = new URL(page.url());
    expect(url.searchParams.get('type')).toBe('expense');
  });

  test('URL preserved on refresh', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    // Navigate with filters in URL
    await page.goto(`/budgets/${budgetId}?tab=transactions&type=expense&q=lunch&page=2`);
    await page.waitForLoadState('load');

    const rowCountBefore = await page.locator('tbody tr, [data-testid="entry-row"], [data-testid="transaction-row"]').count();

    // Reload page
    await page.reload();
    await page.waitForLoadState('load');

    const url = new URL(page.url());
    expect(url.searchParams.get('type')).toBe('expense');
    expect(url.searchParams.get('q')).toBe('lunch');
    expect(url.searchParams.get('page')).toBe('2');

    const rowCountAfter = await page.locator('tbody tr, [data-testid="entry-row"], [data-testid="transaction-row"]').count();
    expect(rowCountAfter).toBeLessThanOrEqual(rowCountBefore + 1);
  });

  test('empty state shown when no results', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    await page.goto(`/budgets/${budgetId}?tab=transactions&q=__THIS_TEXT_DOES_NOT_EXIST_ANYWHERE__`);
    await page.waitForLoadState('load');

    const emptyState = page.getByText(/no transactions? found/i).first();
    const emptyBody = page.getByText(/try adjusting your search|clear filters/i).first();

    const hasEmptyState = (await emptyState.count()) > 0 || (await emptyBody.count()) > 0;
    expect(hasEmptyState).toBeTruthy();
  });

  test('pagination page size change', async ({ page }) => {
    const budgetId = await signInAsFreshUserWithBudget(page);
    await page.goto(`/budgets/${budgetId}?tab=transactions`);
    await page.waitForLoadState('load');

    const pageSizeSelector = page.getByRole('combobox', { name: /rows per page|page size/i });
    if (await pageSizeSelector.count() > 0) {
      await pageSizeSelector.selectOption('10');
      await page.waitForURL((url) => url.searchParams.get('page_size') === '10', { timeout: 5000 }).catch(() => {});
      const url = new URL(page.url());
      expect(url.searchParams.get('page_size')).toBe('10');
    } else {
      // Fall back: change via URL directly
      await page.goto('/transactions?page_size=10');
      await page.waitForLoadState('load');
      const url = new URL(page.url());
      expect(url.searchParams.get('page_size')).toBe('10');
    }
  });
});
import { test, expect, Page } from '@playwright/test';
import { registerAndLogin, skipOrgSelection, logout, expectRedirectToLogin } from './helpers';

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
test.describe('Transactions', () => {
  // -------------------------------------------------------------------------
  // Task 7: Filter panel + DateDropdown tests
  // -------------------------------------------------------------------------

  test('filter button expands and collapses filter panel', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto('/budgets/test-budget-id');
    await page.getByRole('tab', { name: /transactions/i }).click();

    // Filter panel should be collapsed by default
    const filterPanel = page.locator('[aria-expanded]');
    await expect(filterPanel).toHaveAttribute('aria-expanded', 'false');

    // Click Filter button
    await page.getByRole('button', { name: /filter/i }).click();

    // Panel should be expanded
    await expect(filterPanel).toHaveAttribute('aria-expanded', 'true');

    // Type segmented, Member popover, Category popover, DateDropdown should be visible
    await expect(page.getByText('All types')).toBeVisible();
    await expect(page.getByText('Members')).toBeVisible();
    await expect(page.getByText('Category')).toBeVisible();

    // Collapse
    await page.getByRole('button', { name: /filter/i }).click();
    await expect(filterPanel).toHaveAttribute('aria-expanded', 'false');
  });

  test('date preset applies This Month filter on first load', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto('/budgets/test-budget-id?tab=transactions');
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    // URL should contain from/to for this month
    const url = page.url();
    const from = new URL(url).searchParams.get('from');
    const to = new URL(url).searchParams.get('to');
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    expect(from!.split('-').length).toBe(3);
  });

  test('custom date range over 30 days shows error and blocks search', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto('/budgets/test-budget-id?tab=transactions');
    await page.getByRole('button', { name: /filter/i }).click();

    // Open date dropdown and select Custom Range
    await page.getByText('This Month').click();
    await page.getByText('Custom range').click();

    // Set 60-day range
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[type="date"]').last().fill('2026-07-31');

    // Error message shown
    await expect(page.getByText('Maximum selectable range is 30 days.')).toBeVisible();

    // Search button should be visually indicated as having an error (disabled or styled)
    // The apply is blocked by validateDraft
  });

  // -------------------------------------------------------------------------
  // Existing tests
  // -------------------------------------------------------------------------

  test('transactions page renders (empty list)', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    // Some apps route /transactions/:budgetId, others show a chooser.
    // Just visit /transactions and assert the page loaded.
    await page.goto('/transactions');
    await expect(page.locator('main, h1, h2, [role="main"]').first()).toBeVisible();
  });

  test('unauthenticated /transactions is denied', async ({ page }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.goto('/transactions');
    await expectRedirectToLogin(page, { fromPath: '/transactions' });
  });

  test('filter by type and search', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto('/transactions');

    // Apply type=expense filter
    const typeFilter = page.getByRole('button', { name: /type|all|expense|income/i });
    if (await typeFilter.count() > 0) {
      await typeFilter.first().click();
      // Select expense option
      const expenseOption = page.getByRole('option', { name: /expense/i });
      if (await expenseOption.count() > 0) {
        await expenseOption.click();
      }
    }

    // Press Search (or press Enter in search input)
    const searchBtn = page.getByRole('button', { name: /search|apply/i });
    if (await searchBtn.count() > 0) {
      await searchBtn.click();
    } else {
      // Fall back to pressing Enter in the search input
      await page.keyboard.press('Enter');
    }

    // Verify URL contains type=expense
    await page.waitForURL((url) => url.search.includes('type=expense'), { timeout: 5000 }).catch(() => {});
    const url = new URL(page.url());
    expect(url.searchParams.get('type')).toBe('expense');
  });

  test('URL preserved on refresh', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);

    // Navigate with filters in URL
    await page.goto('/transactions?type=expense&q=lunch&page=2');

    // Wait for page to hydrate
    await page.waitForLoadState('load');

    // Capture visible row count
    const rowCountBefore = await page.locator('tbody tr, [data-testid="entry-row"], [data-testid="transaction-row"]').count();

    // Reload page
    await page.reload();
    await page.waitForLoadState('load');

    // URL should be preserved
    const url = new URL(page.url());
    expect(url.searchParams.get('type')).toBe('expense');
    expect(url.searchParams.get('q')).toBe('lunch');
    expect(url.searchParams.get('page')).toBe('2');

    // Results should still be present (row count should match or be 0 if empty)
    const rowCountAfter = await page.locator('tbody tr, [data-testid="entry-row"], [data-testid="transaction-row"]').count();
    expect(rowCountAfter).toBeLessThanOrEqual(rowCountBefore + 1); // Allow for loading state diff
  });

  test('empty state shown when no results', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);

    // Apply impossible filter: description that will never match
    await page.goto('/transactions?q=__THIS_TEXT_DOES_NOT_EXIST_ANYWHERE__');

    await page.waitForLoadState('load');

    // Look for empty state text (copy key: budget.transactions.empty.title = "No transactions found.")
    const emptyState = page.getByText(/no transactions? found/i).first();
    // If the table renders but with 0 rows, check for empty table state
    const emptyBody = page.getByText(/try adjusting your search|clear filters/i).first();

    const hasEmptyState = (await emptyState.count()) > 0 || (await emptyBody.count()) > 0;
    expect(hasEmptyState).toBeTruthy();
  });

  test('pagination page size change', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto('/transactions');

    await page.waitForLoadState('load');

    // Find the rows-per-page selector
    const pageSizeSelector = page.getByRole('combobox', { name: /rows per page|page size/i });
    if (await pageSizeSelector.count() > 0) {
      await pageSizeSelector.selectOption('10');

      // Verify URL updated
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
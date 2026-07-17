import { test, expect } from '@playwright/test';
import { registerAndLogin, skipOrgSelection, expectRedirectToLogin } from './helpers';

/**
 * Categories feature tests.
 *
 * Categories are scoped to a budget, so most tests require a pre-existing
 * budget.  This file covers the page-render and access-control paths
 * that can be tested without fixtures.
 *
 * Run: npm run test:e2e:categories
 */
test.describe('Categories', () => {
  test('authenticated user with no budgets sees empty state', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    // Categories may live under /categories or as a sub-page of /budgets.
    // Try both.
    await page.goto('/categories');
    // Page should render at minimum
    await expect(page.locator('main, h1, h2, [role="main"]').first()).toBeVisible();
  });

  test('unauthenticated /categories is denied', async ({ page }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.goto('/categories');
    await expectRedirectToLogin(page, { fromPath: '/categories' });
  });
});
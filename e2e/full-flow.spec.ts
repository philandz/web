import { test, expect } from '@playwright/test';
import { registerAndLogin, logout } from './helpers';

/**
 * Full-flow end-to-end tests for the post-migration project.
 *
 * Covers:
 *  1. Create a Standard budget
 *  2. Create a category under a budget
 *  3. Create an entry under a category
 *  4. Create a Sharing budget
 *  5. Anonymous access to a Sharing budget
 *
 * These tests use the API (page.request) for setup, which is faster
 * and less flaky than clicking through the UI.
 */

test.describe('Full flow', () => {
  test('authenticated user can create a Standard budget', async ({ page }) => {
    const { email, password } = await registerAndLogin(page, { displayName: 'Full Flow User' });
    const orgs = await page.request.get('/api/identity/organizations');
    expect(orgs.status()).toBe(200);
    const orgsBody = await orgs.json();
    const orgId = orgsBody.organizations[0].id;

    const res = await page.request.post('/api/budget/budgets', {
      data: {
        org_id: orgId,
        name: 'Standard Test Budget',
        budget_type: 'standard',
        currency: 'VND',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Standard Test Budget');
    expect(body.owner_id).toBeTruthy();
    expect(body.budget_type).toBe('standard');
  });

  test('authenticated user can create a category under a budget', async ({ page }) => {
    const creds = await registerAndLogin(page, { displayName: 'Category Test' });
    const orgId = (await (await page.request.get('/api/identity/organizations')).json())
      .organizations[0].id;

    const budgetRes = await page.request.post('/api/budget/budgets', {
      data: { org_id: orgId, name: 'Cat Test Budget', budget_type: 'standard', currency: 'VND' },
    });
    const budgetId = (await budgetRes.json()).id;

    const res = await page.request.post('/api/category/categories', {
      data: {
        budget_id: budgetId,
        name: 'Food',
        kind: 'expense',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('expense');
    expect(body.budget_id).toBe(budgetId);
  });

  test('authenticated user can create an entry under a category', async ({ page }) => {
    const creds = await registerAndLogin(page, { displayName: 'Entry Test' });
    const orgId = (await (await page.request.get('/api/identity/organizations')).json())
      .organizations[0].id;

    const budgetId = (await (await page.request.post('/api/budget/budgets', {
      data: { org_id: orgId, name: 'Entry Test Budget', budget_type: 'standard', currency: 'VND' },
    })).json()).id;

    const catId = (await (await page.request.post('/api/category/categories', {
      data: { budget_id: budgetId, name: 'Food', kind: 'expense' },
    })).json()).id;

    const res = await page.request.post('/api/entry/entries', {
      data: {
        budget_id: budgetId,
        category_id: catId,
        kind: 'expense',
        amount_minor: 1000,
        entry_date: '2026-07-09',
        description: 'Lunch',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.amount_minor).toBe(1000);
    expect(body.kind).toBe('expense');
  });

  test('authenticated user can create a Sharing budget', async ({ page }) => {
    const creds = await registerAndLogin(page, { displayName: 'Sharing Test' });
    const orgId = (await (await page.request.get('/api/identity/organizations')).json())
      .organizations[0].id;

    const res = await page.request.post('/api/budget/budgets', {
      data: {
        org_id: orgId,
        name: 'Group Trip',
        budget_type: 'sharing',
        currency: 'VND',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.budget_type).toBe('sharing');
  });

  test('anonymous user can access a sharing budget', async ({ page, browser }) => {
    // Setup: create a sharing budget as an authenticated user in this context.
    const ctx = await browser.newContext();
    const setupPage = await ctx.newPage();
    const creds = await registerAndLogin(setupPage, { displayName: 'Sharing Owner' });
    const orgId = (await (await setupPage.request.get('/api/identity/organizations')).json())
      .organizations[0].id;
    const budgetRes = await setupPage.request.post('/api/budget/budgets', {
      data: {
        org_id: orgId,
        name: 'Public Sharing Budget',
        budget_type: 'sharing',
        currency: 'VND',
      },
    });
    const budgetId = (await budgetRes.json()).id;
    await setupPage.close();
    await ctx.close();

    // Visit the sharing page as a fully anonymous user (no cookies, no localStorage).
    await page.context().clearCookies();
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
    await page.goto(`/en/sharing/${budgetId}`);
    // Page should render with the budget name (no redirect to login).
    await expect(page.getByText('Public Sharing Budget').first()).toBeVisible({ timeout: 10_000 });
  });
});

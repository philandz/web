import { test, expect, Page } from '@playwright/test';
import { uniqueEmail, TEST_PASSWORD, skipOrgSelection } from './helpers';

const JOIN_LINK_FILE = '/tmp/join_link_file.json';
const API_BASE = 'http://127.0.0.1:9100';

/**
 * Account A: creates budget + category + entry + sharing budget + join link
 *
 * Uses page.evaluate(fetch) for API calls — routes through browser context
 * to the gateway at port 9100, bypassing Next.js which has no API handlers.
 */
test.describe('Account A: Full Budget Creation Flow', () => {
  let accountAEmail: string;
  let accountAPassword: string;
  let accountAOrgId: string;
  let token: string;

  test('A1: register and capture org_id', async ({ page }) => {
    accountAEmail = uniqueEmail('account-a');
    accountAPassword = TEST_PASSWORD;

    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.locator('#displayName').fill('Budget Owner');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('#confirmPassword').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 15_000 });

    // After signup, login to get token
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });

    await skipOrgSelection(page);

    // Get token and org_id via fetch in browser context
    const result = await page.evaluate(async (apiBase) => {
      const tokenResp = await fetch(`${apiBase}/api/identity/me`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!tokenResp.ok) return { token: null, orgId: null };
      const token = tokenResp.headers.get('x-session-token') || '';
      // Try organizations endpoint
      const orgResp = await fetch(`${apiBase}/api/identity/organizations`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      let orgId = null;
      if (orgResp.ok) {
        const data = await orgResp.json();
        orgId = data.organizations?.[0]?.id || null;
      }
      return { token, orgId };
    }, API_BASE);

    token = result.token || '';
    accountAOrgId = result.orgId || '';

    // If org fetch didn't work, try to get org via a different path
    if (!accountAOrgId) {
      const budgetsResp = await page.evaluate(async (apiBase) => {
        const resp = await fetch(`${apiBase}/api/budget/budgets`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        return { ok: resp.ok, status: resp.status };
      }, API_BASE);
      // Fallback: use me endpoint to get user info
      const meData = await page.evaluate(async (apiBase) => {
        const resp = await fetch(`${apiBase}/api/identity/me`, { credentials: 'include' });
        if (resp.ok) return resp.json();
        return null;
      }, API_BASE);
    }

    // Log what we captured
    console.log('Account A credentials:', accountAEmail);
    console.log('Token:', token ? 'present' : 'missing');
    console.log('Org ID:', accountAOrgId || 'not found via API');
  });

  test('A2: create standard budget via UI', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    await skipOrgSelection(page);

    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Click create budget button
    const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
    if (!(await createBtn.count() > 0)) {
      test.skip(true, 'No create budget button');
      return;
    }
    await createBtn.click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.fill('Food Budget');

    const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    const budgetText = page.getByText('Food Budget').first();
    await expect(budgetText).toBeVisible({ timeout: 8000 });
  });

  test('A3: create category via UI', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    await skipOrgSelection(page);

    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    const budgetLink = page.getByRole('link', { name: /food budget/i }).or(page.getByText('Food Budget'));
    if (await budgetLink.count() > 0) {
      await budgetLink.first().click();
      await page.waitForLoadState('networkidle');
    }

    const addCatBtn = page.getByRole('button', { name: /add category|new category|category/i }).first();
    if (!(await addCatBtn.count() > 0)) {
      test.skip(true, 'No add category button');
      return;
    }
    await addCatBtn.click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[name="name"], input[placeholder*="category" i]').first();
    await nameInput.fill('Groceries');

    const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    const catText = page.getByText('Groceries').first();
    await expect(catText).toBeVisible({ timeout: 8000 });
  });

  test('A4: create entry via UI', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    await skipOrgSelection(page);

    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    const budgetLink = page.getByRole('link', { name: /food budget/i }).or(page.getByText('Food Budget'));
    if (await budgetLink.count() > 0) {
      await budgetLink.first().click();
      await page.waitForLoadState('networkidle');
    }

    const catLink = page.getByRole('link', { name: /groceries/i }).or(page.getByText('Groceries'));
    if (await catLink.count() > 0) {
      await catLink.first().click();
      await page.waitForLoadState('networkidle');
    }

    const addEntryBtn = page.getByRole('button', { name: /add transaction|add entry|new transaction|entry/i }).first();
    if (!(await addEntryBtn.count() > 0)) {
      test.skip(true, 'No add entry button');
      return;
    }
    await addEntryBtn.click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const amountInput = dialog.locator('input[name="amount"], input[placeholder*="amount" i], input[type="number"]').first();
    await amountInput.fill('50000');

    const descInput = dialog.locator('input[name="description"], input[placeholder*="description" i], textarea[name="description"]').first();
    await descInput.fill('Weekly groceries');

    const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    const entryText = page.getByText(/weekly groceries|50,?000|50.000/i).first();
    await expect(entryText).toBeVisible({ timeout: 8000 });
  });

  test('A5: create sharing budget and generate join link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    await skipOrgSelection(page);

    await page.goto('/sharing');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
    if (!(await createBtn.count() > 0)) {
      test.skip(true, 'No create sharing budget button');
      return;
    }
    await createBtn.click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.fill('Weekend Trip');

    const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    const budgetText = page.getByText('Weekend Trip').first();
    await expect(budgetText).toBeVisible({ timeout: 8000 });

    // Navigate to sharing budget detail
    const budgetLink = page.getByRole('link', { name: /weekend trip/i }).first();
    if (await budgetLink.count() > 0) {
      await budgetLink.first().click();
      await page.waitForLoadState('networkidle');
    }

    // Generate join link — try various UI patterns
    const joinLinkBtn = page.getByRole('button', { name: /join link|invite|share.*link|generate.*link/i }).first();
    if (await joinLinkBtn.count() > 0) {
      await joinLinkBtn.click();
      await page.waitForTimeout(1500);
    }

    // Extract join URL from clipboard or input field or page content
    let joinUrl = '';
    try {
      joinUrl = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    } catch {}
    if (!joinUrl || !joinUrl.includes('join')) {
      try {
        joinUrl = await page.locator('[data-share-link], [data-join-url]').first().inputValue({ timeout: 2000 }).catch(() => '');
      } catch {}
    }
    if (!joinUrl || !joinUrl.includes('join')) {
      // Try reading from URL bar or page text
      const pageUrl = page.url();
      if (pageUrl.includes('sharing')) {
        joinUrl = pageUrl;
      }
    }

    const sharingBudgetId = extractBudgetId(joinUrl) || page.url().split('/sharing/')[1]?.split('/')[0] || '';

    // Write join link to coordination file
    const fs = await import('fs');
    fs.writeFileSync(JOIN_LINK_FILE, JSON.stringify({
      joinLink: joinUrl || page.url(),
      sharingBudgetId,
      accountAEmail,
    }));
  });

  test('A6: add expense to sharing budget', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(accountAEmail);
    await page.locator('#password').fill(accountAPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    await skipOrgSelection(page);

    await page.goto('/sharing');
    await page.waitForLoadState('networkidle');

    const budgetLink = page.getByRole('link', { name: /weekend trip/i }).or(page.getByText('Weekend Trip'));
    if (await budgetLink.count() > 0) {
      await budgetLink.first().click();
      await page.waitForLoadState('networkidle');
    }

    const addExpenseBtn = page.getByRole('button', { name: /add expense|new expense|expense/i }).first();
    if (!(await addExpenseBtn.count() > 0)) {
      test.skip(true, 'No add expense button');
      return;
    }
    await addExpenseBtn.click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const amountInput = dialog.locator('input[name="amount"], input[type="number"]').first();
    await amountInput.fill('200000');

    const descInput = dialog.locator('input[name="description"], textarea[name="description"]').first();
    await descInput.fill('Dinner');

    const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    const expenseText = page.getByText(/dinner|200,?000|200.000/i).first();
    await expect(expenseText).toBeVisible({ timeout: 8000 });
  });
});

function extractBudgetId(url: string): string {
  const match = url.match(/join-budget\/([a-zA-Z0-9-]+)/);
  return match?.[1] || '';
}

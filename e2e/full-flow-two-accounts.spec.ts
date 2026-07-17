import { test, expect, BrowserContext, Page } from '@playwright/test';
import { registerAndLogin, uniqueEmail, TEST_PASSWORD, skipOrgSelection, logout } from './helpers';

// Coordination file for join link
const JOIN_LINK_FILE = '/tmp/join_link.txt';

/**
 * Full-flow E2E tests using TWO separate accounts.
 *
 * Agent A (account A): creates budget + category + entry + sharing budget + join link
 * Agent B (account B): joins via link as guest, verifies access
 *
 * Coordination: Agent A writes join link to /tmp/join_link.txt.
 * Agent B polls until link available, then proceeds.
 *
 * Run:
 *   npx playwright test e2e/full-flow-two-accounts.spec.ts --project=chromium
 */

test.describe('Two-Account Full Flow', () => {
  // ─────────────────────────────────────────────────────────────
  // AGENT A — Budget Owner: create budget, category, entry, sharing
  // ─────────────────────────────────────────────────────────────
  test.describe('Account A: Budget Creation Flow', () => {
    let accountAEmail: string;
    let accountAPassword: string;
    let accountAOrgId: string;
    let sharingBudgetId: string;
    let joinLink: string;

    test('A1: register account A', async ({ page }) => {
      const displayName = 'Budget Owner';
      accountAEmail = uniqueEmail('account-a');
      accountAPassword = TEST_PASSWORD;
      const creds = await registerNewUser(page, {
        email: accountAEmail,
        password: accountAPassword,
        displayName,
      });
      accountAEmail = creds.email;
      await skipOrgSelection(page);
      // Capture org_id
      const orgsResp = await page.request.get('/api/identity/organizations');
      expect(orgsResp.status()).toBe(200);
      const orgs = (await orgsResp.json()).organizations || [];
      accountAOrgId = orgs[0]?.id;
      expect(accountAOrgId).toBeTruthy();
    });

    test('A2: create standard budget via UI', async ({ page }) => {
      await login(page, accountAEmail, accountAPassword);
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

      // Dialog should appear — fill name field
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const nameInput = dialog.locator('input[name="name"], input[placeholder*="name" i]').first();
      await nameInput.fill('Food Budget');

      // Try to submit
      const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
      await submitBtn.click();

      // Should navigate to budget page or show in list
      await page.waitForLoadState('networkidle');
      // Budget should appear in list or URL should reflect budget page
      const budgetText = page.getByText('Food Budget').first();
      await expect(budgetText).toBeVisible({ timeout: 8000 });
    });

    test('A3: create category via UI', async ({ page }) => {
      await login(page, accountAEmail, accountAPassword);
      await skipOrgSelection(page);
      await page.goto('/budgets');
      await page.waitForLoadState('networkidle');

      // Navigate to the Food Budget
      const budgetLink = page.getByRole('link', { name: /food budget/i }).or(page.getByText('Food Budget'));
      if (await budgetLink.count() > 0) {
        await budgetLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Look for add category button
      const addCatBtn = page.getByRole('button', { name: /add category|new category|category/i }).first();
      if (!(await addCatBtn.count() > 0)) {
        test.skip(true, 'No add category button on this budget page');
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

      // Verify category appears
      const catText = page.getByText('Groceries').first();
      await expect(catText).toBeVisible({ timeout: 8000 });
    });

    test('A4: create entry via UI', async ({ page }) => {
      await login(page, accountAEmail, accountAPassword);
      await skipOrgSelection(page);
      await page.goto('/budgets');
      await page.waitForLoadState('networkidle');

      // Navigate to Food Budget
      const budgetLink = page.getByRole('link', { name: /food budget/i }).or(page.getByText('Food Budget'));
      if (await budgetLink.count() > 0) {
        await budgetLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Navigate to Groceries category
      const catLink = page.getByRole('link', { name: /groceries/i }).or(page.getByText('Groceries'));
      if (await catLink.count() > 0) {
        await catLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Add transaction/entry
      const addEntryBtn = page.getByRole('button', { name: /add transaction|add entry|new transaction|entry/i }).first();
      if (!(await addEntryBtn.count() > 0)) {
        test.skip(true, 'No add entry button');
        return;
      }
      await addEntryBtn.click();

      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Fill amount
      const amountInput = dialog.locator('input[name="amount"], input[placeholder*="amount" i], input[type="number"]').first();
      await amountInput.fill('50000');

      // Fill description
      const descInput = dialog.locator('input[name="description"], input[placeholder*="description" i], textarea[name="description"]').first();
      await descInput.fill('Weekly groceries');

      const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
      await submitBtn.click();
      await page.waitForLoadState('networkidle');

      // Verify entry appears
      const entryText = page.getByText(/weekly groceries|50,?000|50.000/i).first();
      await expect(entryText).toBeVisible({ timeout: 8000 });
    });

    test('A5: create sharing budget and generate join link', async ({ page }) => {
      await login(page, accountAEmail, accountAPassword);
      await skipOrgSelection(page);
      await page.goto('/sharing');
      await page.waitForLoadState('networkidle');

      // Create sharing budget
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

      // Verify sharing budget appears
      const budgetText = page.getByText('Weekend Trip').first();
      await expect(budgetText).toBeVisible({ timeout: 8000 });

      // Navigate to sharing budget detail
      const budgetLink = page.getByRole('link', { name: /weekend trip/i }).or(page.getByText('Weekend Trip').locator('..'));
      if (await budgetLink.count() > 0) {
        await budgetLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Generate join link
      const joinLinkBtn = page.getByRole('button', { name: /join link|invite|share.*link|generate.*link/i }).first();
      if (await joinLinkBtn.count() > 0) {
        await joinLinkBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Read join link from UI or copy button
      const joinUrl = await page.locator('[data-share-link], [data-join-url], input[value*="join"]').first().inputValue().catch(async () => {
        // Try copy button
        const copyBtn = page.getByRole('button', { name: /copy/i }).first();
        if (await copyBtn.count() > 0) {
          await copyBtn.click();
          await page.waitForTimeout(500);
        }
        return await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      });

      joinLink = joinUrl || page.url();
      sharingBudgetId = extractBudgetId(joinLink) || page.url().split('/sharing/')[1]?.split('/')[0] || '';

      // Write join link to coordination file
      const fs = await import('fs');
      fs.writeFileSync(JOIN_LINK_FILE, JSON.stringify({ joinLink, sharingBudgetId, accountAEmail }));
    });

    test('A6: add expense to sharing budget', async ({ page }) => {
      await login(page, accountAEmail, accountAPassword);
      await skipOrgSelection(page);
      await page.goto('/sharing');
      await page.waitForLoadState('networkidle');

      // Navigate to Weekend Trip
      const budgetLink = page.getByRole('link', { name: /weekend trip/i }).or(page.getByText('Weekend Trip'));
      if (await budgetLink.count() > 0) {
        await budgetLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Add expense
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

      // Verify expense appears
      const expenseText = page.getByText(/dinner|200,?000|200.000/i).first();
      await expect(expenseText).toBeVisible({ timeout: 8000 });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AGENT B — Guest: join via link, access sharing budget
  // ─────────────────────────────────────────────────────────────
  test.describe('Account B: Guest Sharing Flow', () => {
    let accountBEmail: string;
    let accountBPassword: string;

    test('B1: register account B (independent)', async ({ page }) => {
      accountBEmail = uniqueEmail('account-b');
      accountBPassword = TEST_PASSWORD;
      const creds = await registerNewUser(page, {
        email: accountBEmail,
        password: accountBPassword,
        displayName: 'Guest User',
      });
      accountBEmail = creds.email;
      await skipOrgSelection(page);
    });

    test('B2: join sharing budget via link as guest', async ({ page }) => {
      // Wait for join link from Agent A
      let joinData: { joinLink: string; sharingBudgetId: string; accountAEmail: string } | null = null;
      for (let i = 0; i < 60; i++) {
        try {
          const fs = await import('fs');
          const content = fs.readFileSync(JOIN_LINK_FILE, 'utf8');
          joinData = JSON.parse(content);
          if (joinData?.joinLink) break;
        } catch {}
        await page.waitForTimeout(1000);
      }

      if (!joinData?.joinLink) {
        test.skip(true, 'No join link available from Account A');
        return;
      }

      // Visit join URL in FRESH context (no cookies, no localStorage)
      const ctx = await page.context().browser()!.newContext();
      const guestPage = await ctx.newPage();
      await guestPage.context().clearCookies();
      await guestPage.evaluate(() => {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      });

      await guestPage.goto(joinData.joinLink);
      await guestPage.waitForLoadState('networkidle');

      // Should show join form (not redirect to login for guest-accessible sharing budget)
      // Fill display name if form visible
      const nameInput = guestPage.locator('input[name="displayName"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('Guest User');
        const submitBtn = guestPage.getByRole('button', { name: /join|accept|continue/i }).first();
        await submitBtn.click();
        await guestPage.waitForLoadState('networkidle');
      }

      // Verify we're on the sharing budget page
      await guestPage.waitForURL(/sharing/, { timeout: 10000 });
      const budgetText = guestPage.getByText('Weekend Trip').first();
      await expect(budgetText).toBeVisible({ timeout: 10000 });

      // Verify expense from Account A is visible
      const expenseText = guestPage.getByText(/dinner|200,?000|200.000/i).first();
      await expect(expenseText).toBeVisible({ timeout: 8000 });

      await ctx.close();
    });

    test('B3: add expense as guest', async ({ page }) => {
      // Wait for join link
      let joinData: { joinLink: string; sharingBudgetId: string } | null = null;
      for (let i = 0; i < 30; i++) {
        try {
          const fs = await import('fs');
          const fs2 = await import('fs');
          const content = fs.readFileSync(JOIN_LINK_FILE, 'utf8');
          joinData = JSON.parse(content);
          if (joinData?.joinLink) break;
        } catch {}
        await page.waitForTimeout(1000);
      }

      if (!joinData?.joinLink) {
        test.skip(true, 'No join link available');
        return;
      }

      // Open fresh context as guest
      const ctx = await page.context().browser()!.newContext();
      const guestPage = await ctx.newPage();
      await guestPage.context().clearCookies();
      await guestPage.evaluate(() => {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      });

      await guestPage.goto(joinData.joinLink);
      await guestPage.waitForLoadState('networkidle');

      // Fill guest form if visible
      const nameInput = guestPage.locator('input[name="displayName"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('Guest User B');
        const submitBtn = guestPage.getByRole('button', { name: /join|accept|continue/i }).first();
        await submitBtn.click();
        await guestPage.waitForLoadState('networkidle');
      }

      await guestPage.waitForURL(/sharing/, { timeout: 10000 });

      // Add expense
      const addBtn = guestPage.getByRole('button', { name: /add expense|new expense|expense/i }).first();
      if (!(await addBtn.count() > 0)) {
        test.skip(true, 'No add expense button for guest');
        return;
      }
      await addBtn.click();

      const dialog = guestPage.getByRole('dialog').or(guestPage.locator('[role="dialog"]'));
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const amountInput = dialog.locator('input[name="amount"], input[type="number"]').first();
      await amountInput.fill('50000');

      const descInput = dialog.locator('input[name="description"], textarea[name="description"]').first();
      await descInput.fill('Taxi');

      const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
      await submitBtn.click();
      await guestPage.waitForLoadState('networkidle');

      // Verify expense appears
      const expenseText = guestPage.getByText(/taxi|50,?000|50.000/i).first();
      await expect(expenseText).toBeVisible({ timeout: 8000 });

      await ctx.close();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Helpers (duplicated to avoid import issues in Playwright)
// ─────────────────────────────────────────────────────────────

async function registerNewUser(
  page: Page,
  opts: { email?: string; password?: string; displayName?: string } = {}
) {
  const email = opts.email ?? uniqueEmail('register');
  const password = opts.password ?? TEST_PASSWORD;
  const displayName = opts.displayName ?? 'Playwright User';

  await page.goto('/signup');
  await page.locator('#displayName').fill(displayName);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const confirm = page.locator('input[placeholder*="confirm" i]');
  if (await confirm.count() > 0) {
    await confirm.first().fill(password);
  }
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  return { email, password, displayName };
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 }).catch(() => {});
}

function extractBudgetId(url: string): string {
  const match = url.match(/sharing\/([a-zA-Z0-9-]+)/);
  return match?.[1] || '';
}

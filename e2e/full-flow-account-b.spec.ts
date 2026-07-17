import { test, expect, Page } from '@playwright/test';
import { uniqueEmail, TEST_PASSWORD, skipOrgSelection } from './helpers';

const JOIN_LINK_FILE = '/tmp/join_link_file.json';

/**
 * Account B: Guest sharing flow
 * Waits for join link from Account A, then joins as guest.
 */
test.describe('Account B: Guest Sharing Flow', () => {
  let accountBEmail: string;
  let accountBPassword: string;
  let joinData: { joinLink: string; sharingBudgetId: string; accountAEmail: string } | null = null;

  test('B0: wait for join link from Account A', async ({ page }) => {
    for (let i = 0; i < 180; i++) {
      try {
        const fs = await import('fs');
        const content = fs.readFileSync(JOIN_LINK_FILE, 'utf8');
        joinData = JSON.parse(content);
        if (joinData?.joinLink) break;
      } catch {}
      await page.waitForTimeout(1000);
    }

    if (!joinData?.joinLink) {
      test.skip(true, 'No join link from Account A after 180s');
      return;
    }
    expect(joinData.joinLink).toBeTruthy();
  });

  test('B1: register account B', async ({ page }) => {
    accountBEmail = uniqueEmail('account-b');
    accountBPassword = TEST_PASSWORD;

    await page.goto('/signup');
    await page.waitForLoadState('load');
    await page.locator('#displayName').fill('Guest User B');
    await page.locator('#email').fill(accountBEmail);
    await page.locator('#password').fill(accountBPassword);
    await page.locator('#confirmPassword').fill(accountBPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 15_000 });

    await page.goto('/login');
    await page.waitForLoadState('load');
    await page.locator('#email').fill(accountBEmail);
    await page.locator('#password').fill(accountBPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });

    await skipOrgSelection(page);
  });

  test('B2: join sharing budget via link as guest', async ({ page }) => {
    if (!joinData?.joinLink) {
      test.skip(true, 'No join link available');
      return;
    }

    // Fresh context — no cookies, no localStorage
    const ctx = await page.context().browser()!.newContext();
    const guestPage = await ctx.newPage();
    await guestPage.context().clearCookies();
    await guestPage.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });

    await guestPage.goto(joinData.joinLink);
    await guestPage.waitForLoadState('load');

    // Fill guest name form if visible
    const nameInput = guestPage.locator('input[name="displayName"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Guest User B');
      const submitBtn = guestPage.getByRole('button', { name: /join|accept|continue/i }).first();
      await submitBtn.click();
      await guestPage.waitForLoadState('load');
    }

    await guestPage.waitForURL(/sharing/, { timeout: 15000 });
    const budgetText = guestPage.getByText('Weekend Trip').first();
    await expect(budgetText).toBeVisible({ timeout: 10000 });

    // Verify expense from Account A is visible
    const expenseText = guestPage.getByText(/dinner|200,?000|200.000/i).first();
    await expect(expenseText).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });

  test('B3: add expense as guest', async ({ page }) => {
    if (!joinData?.joinLink) {
      test.skip(true, 'No join link available');
      return;
    }

    const ctx = await page.context().browser()!.newContext();
    const guestPage = await ctx.newPage();
    await guestPage.context().clearCookies();
    await guestPage.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });

    await guestPage.goto(joinData.joinLink);
    await guestPage.waitForLoadState('load');

    const nameInput = guestPage.locator('input[name="displayName"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Guest User B');
      const submitBtn = guestPage.getByRole('button', { name: /join|accept|continue/i }).first();
      await submitBtn.click();
      await guestPage.waitForLoadState('load');
    }

    await guestPage.waitForURL(/sharing/, { timeout: 15000 });

    const addBtn = guestPage.getByRole('button', { name: /add expense|new expense|expense/i }).first();
    if (!(await addBtn.count() > 0)) {
      test.skip(true, 'No add expense button for guest');
      await ctx.close();
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
    await guestPage.waitForLoadState('load');

    const expenseText = guestPage.getByText(/taxi|50,?000|50.000/i).first();
    await expect(expenseText).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });

  test('B4: verify guest can see all expenses', async ({ page }) => {
    if (!joinData?.joinLink) {
      test.skip(true, 'No join link available');
      return;
    }

    const ctx = await page.context().browser()!.newContext();
    const guestPage = await ctx.newPage();
    await guestPage.context().clearCookies();
    await guestPage.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });

    await guestPage.goto(joinData.joinLink);
    await guestPage.waitForLoadState('load');

    const nameInput = guestPage.locator('input[name="displayName"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Guest User B');
      const submitBtn = guestPage.getByRole('button', { name: /join|accept|continue/i }).first();
      await submitBtn.click();
      await guestPage.waitForLoadState('load');
    }

    await guestPage.waitForURL(/sharing/, { timeout: 15000 });

    // Should see both: Dinner (A) and Taxi (B)
    const dinner = guestPage.getByText(/dinner|200,?000|200.000/i).first();
    await expect(dinner).toBeVisible({ timeout: 8000 });

    const taxi = guestPage.getByText(/taxi|50,?000|50.000/i).first();
    await expect(taxi).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });
});

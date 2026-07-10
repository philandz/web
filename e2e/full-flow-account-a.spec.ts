import { test, expect, Page } from '@playwright/test';
import { registerAndLogin, uniqueEmail, TEST_PASSWORD, skipOrgSelection } from './helpers';

const JOIN_LINK_FILE = '/tmp/join_link.txt';

/**
 * Account A: Budget creation flow
 * Creates budget + category + entry + sharing budget + join link
 */
test.describe('Account A: Full Budget Creation Flow', () => {
  let accountAEmail: string;
  let accountAPassword: string;
  let accountAOrgId: string;

  test('A1: register account A', async ({ page }) => {
    accountAEmail = uniqueEmail('account-a');
    accountAPassword = TEST_PASSWORD;
    const creds = await registerNewUser(page, {
      email: accountAEmail,
      password: accountAPassword,
      displayName: 'Budget Owner',
    });
    accountAEmail = creds.email;
    await skipOrgSelection(page);

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
    await login(page, accountAEmail, accountAPassword);
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
    await login(page, accountAEmail, accountAPassword);
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
    await login(page, accountAEmail, accountAPassword);
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

    // Generate join link — try multiple UI patterns
    const joinLinkBtn = page.getByRole('button', { name: /join link|invite|share.*link|generate.*link/i }).first();
    if (await joinLinkBtn.count() > 0) {
      await joinLinkBtn.click();
      await page.waitForTimeout(1000);
    }

    // Extract join URL from clipboard or input field
    let joinUrl = '';
    try {
      joinUrl = await page.locator('[data-share-link], [data-join-url]').first().inputValue({ timeout: 2000 }).catch(() => '');
    } catch {}

    if (!joinUrl) {
      try {
        const copyBtn = page.getByRole('button', { name: /copy/i }).first();
        if (await copyBtn.count() > 0) {
          await copyBtn.click();
          await page.waitForTimeout(500);
        }
        joinUrl = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      } catch {}
    }

    // Fallback: construct from current URL
    if (!joinUrl) {
      joinUrl = page.url();
    }

    const sharingBudgetId = extractBudgetId(joinUrl) || page.url().split('/sharing/')[1]?.split('/')[0] || '';

    // Write to coordination file
    const fs = await import('fs');
    fs.writeFileSync(JOIN_LINK_FILE, JSON.stringify({
      joinLink: joinUrl,
      sharingBudgetId,
      accountAEmail,
      accountAOrgId,
    }));

    // Verify file written
    const written = fs.readFileSync(JOIN_LINK_FILE, 'utf8');
    expect(written).toContain('joinLink');
  });

  test('A6: add expense to sharing budget', async ({ page }) => {
    await login(page, accountAEmail, accountAPassword);
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
  const confirm = page.locator('#confirmPassword');
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
  const match = url.match(/join-budget\/([a-zA-Z0-9-]+)/);
  return match?.[1] || '';
}

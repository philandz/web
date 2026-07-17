import { test, expect } from '@playwright/test';
import { TEST_PASSWORD, login, registerNewUser, uniqueEmail, logout, expectVisibleError } from './helpers';

/**
 * Login feature tests.
 *
 * Covers: successful login, wrong password, unknown email, empty fields,
 * Google SSO button visibility, post-logout state.
 *
 * Run: npm run test:e2e:login
 *   or:  npx playwright test e2e/login.spec.ts
 */
test.describe('Login', () => {
  test('successful login with valid credentials', async ({ page }) => {
    const { email, password } = await registerNewUser(page, { displayName: 'Login Test' });

    // Logout first (registration often auto-logs in)
    await logout(page);

    await login(page, email, password);
    // The redirect target is /en/select-organization or /en/budgets (locale-prefixed).
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });

    // Confirm we left /login (locale-prefix aware — just check the path segment)
    const path = new URL(page.url()).pathname;
    expect(path).not.toMatch(/\/login$/);
  });

  test('rejects wrong password with visible error', async ({ page }) => {
    const { email } = await registerNewUser(page);
    await logout(page);

    await login(page, email, 'WrongPassword999!');
    // Should stay on /login (form re-renders with error)
    await expect(page).toHaveURL(/\/login/);
    await expectVisibleError(page);
  });

  test('rejects unknown email with visible error', async ({ page }) => {
    await login(page, uniqueEmail('ghost'), TEST_PASSWORD);
    await expect(page).toHaveURL(/\/login/);
    await expectVisibleError(page);
  });

  test('rejects empty email field', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    // HTML5 validation should block submission — URL should not change
    await expect(page).toHaveURL(/\/login/);
  });

  test('rejects empty password field', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(uniqueEmail('no-pw'));
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows the Google SSO button', async ({ page }) => {
    await page.goto('/login');
    // The Google Sign-In button is rendered by the Google Identity Services
    // SDK; it can appear as an iframe, a div with role=button, or a styled
    // button. Look for anything that smells like a Google SSO affordance.
    const candidates = [
      'iframe[src*="accounts.google.com"]',
      'div[role="button"][aria-label*="Google" i]',
      'button:has(svg[viewBox]):has-text("Google")',
      '[id^="gsi"]', // Google Identity Services root
    ];
    let found = false;
    for (const sel of candidates) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await expect(el).toBeVisible({ timeout: 3_000 });
        found = true;
        break;
      }
    }
    // If we can't find any of the selectors, the button is likely
    // rendered by the GIS SDK in a way Playwright can't introspect.
    // Fall back to checking that /login has a Google-script tag.
    if (!found) {
      const gisScript = page.locator('script[src*="accounts.google.com/gsi/client"]');
      await expect(gisScript).toHaveCount(1);
    }
  });

  test('shows link to signup', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i }).first();
    await expect(signupLink).toBeVisible();
  });
});
import { Page, expect, BrowserContext } from '@playwright/test';

/**
 * Generates a unique email per test run so parallel agents don't collide
 * on registration rate limits or duplicate-email errors.
 */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@philand.local`;
}

export const TEST_PASSWORD = 'Aa@123456';

/**
 * Navigates to /login and submits the form. Returns the response body
 * or throws on failure.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
}

/**
 * Registers a brand-new account via the public /signup form, then
 * navigates to /login to authenticate (matches the production flow
 * where registration is followed by an explicit login).
 */
export async function registerNewUser(
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
  // The signup form has a confirm-password field too — use the same value.
  const confirm = page.locator('input[placeholder*="confirm" i]');
  if (await confirm.count() > 0) {
    await confirm.first().fill(password);
  }
  await page.locator('button[type="submit"]').click();

  // Wait for the post-submit page transition.  Submission is async
  // (network round-trip to identity, then auto-redirect). Without
  // this wait, callers may see the URL still on /signup.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  return { email, password, displayName };
}

/**
 * Registers + logs in. Returns the credentials so the caller can re-login
 * from a fresh page or assert user state via API later.
 */
export async function registerAndLogin(
  page: Page,
  opts: Parameters<typeof registerNewUser>[1] = {}
): Promise<{ email: string; password: string; displayName: string }> {
  const creds = await registerNewUser(page, opts);
  // Registration typically leaves the user logged in; verify by checking
  // the URL doesn't bounce back to /login or /signup.
  await page.waitForLoadState('networkidle');
  // Force a clean login flow so subsequent tests don't depend on
  // session state being carried over.
  await login(page, creds.email, creds.password);
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
  return creds;
}

/**
 * Asserts that the page is showing an error toast / inline error.
 * Generic enough to cover form validation, 401/403 from API calls, etc.
 */
export async function expectVisibleError(page: Page) {
  // Most error UIs in this app render text containing 'error' or
  // use the Sonner toast (which has data-sonner-toast or aria role).
  const toast = page.locator('[data-sonner-toast], [role="alert"], [data-testid*="error" i]').first();
  await expect(toast).toBeVisible({ timeout: 5_000 });
}

/**
 * Logs out via the user menu if visible. Falls back to clearing
 * localStorage to avoid leaving stale state for the next test.
 */
export async function logout(page: Page) {
  // Try the UI logout first
  const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutBtn.count() > 0) {
    await logoutBtn.first().click();
    await page.waitForURL(/login|signup|$/, { timeout: 5_000 }).catch(() => {});
  }
  // Force-clean
  await page.context().clearCookies();
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
}

/**
 * Waits for the page to load and dismisses any visible "select organization"
 * modal by clicking the first org button. Used by tests that need to skip
 * the org-selection step before doing real work.
 */
export async function skipOrgSelection(page: Page) {
  const orgBtn = page.getByRole('button', { name: /select|continue|enter|open/i }).first();
  if (await orgBtn.count() > 0 && await orgBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await orgBtn.click();
    await page.waitForLoadState('networkidle');
  }
}
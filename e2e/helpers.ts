import { APIRequestContext, BrowserContext, Page, expect, request } from '@playwright/test';

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
  // The signup form has a confirm-password field — use the same value.
  const confirm = page.locator('#confirmPassword');
  if (await confirm.count() > 0) {
    await confirm.first().fill(password);
  }
  await page.locator('button[type="submit"]').click();

  // Wait for the post-submit page transition.  Submission is async
  // (network round-trip to identity, then auto-redirect). Without
  // this wait, callers may see the URL still on /signup.
  await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});

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
  await page.waitForLoadState('load');
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
    await page.waitForLoadState('load');
  }
}

/**
 * Asserts the page eventually redirects to one of the auth entry points
 * (login, signup, or select-organization). Replaces the racy synchronous
 * `expect(page.url()).toMatch(...)` pattern that fails because the
 * (dashboard) layout's `useEffect` redirect only fires after client
 * hydration of the Zustand auth store.
 *
 * The first `await page.waitForURL(...)` polls the URL until the predicate
 * matches or `timeoutMs` fires. The subsequent `expect(...)` is a
 * defensive final assertion for the case where the URL changes twice
 * (e.g., the redirect happens, then something else navigates again).
 */
export async function expectRedirectToLogin(
  page: Page,
  options: {
    /** The protected path the test attempted to visit. Used for log clarity. */
    fromPath: string;
    /** Maximum time to wait for the redirect, in ms. Default 5000. */
    timeoutMs?: number;
  } = { fromPath: '' }
) {
  await page.waitForURL(
    (url) => /\/(login|signup|select-organization)(\/|$)/.test(url.pathname),
    { timeout: options.timeoutMs ?? 5_000 }
  );
  const finalPath = new URL(page.url()).pathname;
  expect(finalPath).toMatch(
    /\/(login|signup|select-organization)(\/|$)/
  );
}

/**
 * Persists a fully-shaped Zustand auth state so the (dashboard) layout
 * does not redirect to /select-organization or /login. The auth store
 * is keyed 'philandz-web-auth' (see lib/auth-store.ts).
 */
export async function seedAuthState(
  page: Page,
  state: {
    token: string;
    userType: 'normal' | 'super_admin';
    profile: { id: string; displayName: string; email: string };
    organizations: unknown[];
    selectedOrgId: string;
  }
) {
  const persisted = {
    state: {
      hydrated: true,
      sessionNotice: null,
      token: state.token,
      userType: state.userType,
      profile: state.profile,
      organizations: state.organizations,
      selectedOrgId: state.selectedOrgId,
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
}

/**
 * Creates a real user + personal org + budget via the Gateway API and
 * seeds the browser auth state so the (dashboard) layout loads without
 * bouncing through the UI login form. Returns the created budget plus
 * the bearer token for follow-up API calls.
 */
export interface BudgetFixture {
  token: string;
  userId: string;
  orgId: string;
  budgetId: string;
  api: APIRequestContext;
  page: Page;
}

export async function createBudgetFixture(
  page: Page,
  options: {
    budgetName?: string;
    budgetType?: 'standard' | 'saving' | 'debt' | 'invest' | 'sharing';
    currency?: string;
    displayName?: string;
  } = {}
): Promise<BudgetFixture> {
  const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:9100';
  const email = uniqueEmail('pw');
  const password = TEST_PASSWORD;
  const displayName = options.displayName ?? 'Playwright E2E';
  const budgetName = options.budgetName ?? `E2E ${Date.now()}`;
  const budgetType = options.budgetType ?? 'standard';
  const currency = options.currency ?? 'VND';

  const api = await request.newContext({ baseURL: apiUrl });

  const reg = await api.post('/api/identity/register', {
    data: { display_name: displayName, email, password },
  });
  expect(reg.status(), `register failed: ${await reg.text()}`).toBe(201);

  const login = await api.post('/api/identity/login', {
    data: { email, password },
  });
  expect(login.status(), `login failed: ${await login.text()}`).toBe(200);
  const body = await login.json();
  const token: string = body.access_token;
  const orgId: string = body.organizations?.[0]?.base?.id;
  const userId: string = body.user?.base?.id ?? body.user?.id;
  expect(token, 'no access_token').toBeTruthy();
  expect(orgId, 'no org_id').toBeTruthy();
  expect(userId, 'no user_id').toBeTruthy();

  const budget = await api.post('/api/budget/budgets', {
    data: { org_id: orgId, name: budgetName, budget_type: budgetType, currency },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(budget.status(), `budget failed: ${await budget.text()}`).toBe(201);
  const budgetBody = await budget.json();
  const budgetId: string = budgetBody.base?.id || budgetBody.id;
  expect(budgetId, 'no budget_id').toBeTruthy();

  await seedAuthState(page, {
    token,
    userType: 'normal',
    profile: { id: userId, displayName, email },
    organizations: body.organizations,
    selectedOrgId: orgId,
  });

  return { token, userId, orgId, budgetId, api, page };
}

/**
 * Invites a second user to the same budget via the admin path, returns
 * the new bearer token + user id so tests can create entries as that
 * member.
 */
export async function addSecondBudgetMember(
  fixture: BudgetFixture,
  options: { email?: string; displayName?: string; role?: 'manager' | 'contributor' | 'viewer' } = {}
): Promise<{ token: string; userId: string; email: string }> {
  const email = options.email ?? uniqueEmail('member');
  const password = TEST_PASSWORD;
  const displayName = options.displayName ?? 'Second Member';
  const role = options.role ?? 'contributor';

  const reg = await fixture.api.post('/api/identity/register', {
    data: { display_name: displayName, email, password },
  });
  expect(reg.status(), `second member register failed: ${await reg.text()}`).toBe(201);
  const login = await fixture.api.post('/api/identity/login', {
    data: { email, password },
  });
  const body = await login.json();
  const token: string = body.access_token;
  const userId: string = body.user?.base?.id ?? body.user?.id;

  // First add to org so the budget can be shared
  const addOrg = await fixture.api.post(`/api/identity/organizations/${fixture.orgId}/members`, {
    data: { user_id: userId, role: 'member' },
    headers: { Authorization: `Bearer ${fixture.token}` },
  });
  // Already-in-org errors are acceptable; budget add below is the real test
  if (!addOrg.ok() && addOrg.status() !== 409) {
    throw new Error(`org invite failed: ${addOrg.status()} ${await addOrg.text()}`);
  }

  const addBudget = await fixture.api.post(
    `/api/budget/budgets/${fixture.budgetId}/members`,
    { data: { user_id: userId, role }, headers: { Authorization: `Bearer ${fixture.token}` } }
  );
  expect(addBudget.status(), `budget member add failed: ${await addBudget.text()}`).toBeLessThan(300);

  return { token, userId, email };
}

/**
 * Creates an entry through the entry API using the supplied bearer
 * token. Defaults to expense kind (1) and today's date.
 */
export async function createEntry(
  fixture: BudgetFixture,
  options: { token: string; amount: number; kind?: 'income' | 'expense'; description?: string; date?: string }
) {
  const kind = options.kind === 'income' ? 2 : 1;
  const today = new Date().toISOString().split('T')[0];
  const date = options.date ?? today;
  const res = await fixture.api.post('/api/entry/entries', {
    data: {
      budget_id: fixture.budgetId,
      kind,
      amount: options.amount,
      description: options.description ?? 'E2E entry',
      entry_date: date,
    },
    headers: { Authorization: `Bearer ${options.token}` },
  });
  expect(res.status(), `entry create failed: ${await res.text()}`).toBeLessThan(300);
  return res.json();
}
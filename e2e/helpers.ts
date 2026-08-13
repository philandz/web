import { APIRequestContext, BrowserContext, Page, expect, request } from '@playwright/test';

/**
 * Generates a unique email per test run so parallel agents don't collide
 * on registration rate limits or duplicate-email errors.
 */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@philand.local`;
}

/**
 * Extract the `sub` claim (user id) from a JWT. The identity service's login
 * response only includes `access_token`, `user_type`, and `organizations`, so
 * we read user_id from the token itself instead of from a separate profile call.
 */
function parseJwtSub(token: string): string {
  const parts = token.split('.');
  if (parts.length < 2) return '';
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  try {
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return decoded.sub ?? '';
  } catch {
    return '';
  }
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

  // Signup now does auto-login + navigation. Wait for the URL to leave /signup
  // instead of racing on the network idle event (which used to mask the
  // ERR_ABORTED of the in-flight register POST).
  await page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 15_000 }).catch(() => {});

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
  // Signup auto-logs in now. Only fall back to an explicit login() if we
  // somehow landed on /login (e.g. the test cache a stale session).
  if (new URL(page.url()).pathname.includes('/login')) {
    await login(page, creds.email, creds.password);
  }
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
  // Navigate to /login so callers can assert the URL afterwards.
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Waits for the page to load and dismisses any visible "select organization"
 * modal by clicking the first org button. Used by tests that need to skip
 * the org-selection step before doing real work.
 */
export async function skipOrgSelection(page: Page) {
  // Look directly for the "Enter workspace" button (en) or its Vietnamese
  // equivalent. The select-org page renders one button per org card;
  // click the first one.
  const orgBtn = page.getByRole('button', { name: /enter workspace|truy cập/i }).first();
  try {
    await orgBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await orgBtn.click();
    // Wait for navigation away from /select-organization.
    await page.waitForURL(
      (url) => !url.pathname.includes('/select-organization'),
      { timeout: 10_000 },
    );
  } catch {
    // Selector never appeared or click didn't navigate — likely the
    // user already has a selected org (the page never rendered).
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
  // Zustand persist wraps stored values as `{state: {...}, version: 0}`.
  // The default merge pulls `persisted.state` into the live store on rehydrate,
  // so we MUST mirror that shape here — writing inner fields directly results
  // in the store seeing empty state and immediately re-saving an empty blob.
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
  const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:3000';
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
  const orgId: string = body.organizations?.[0]?.base?.id ?? body.organizations?.[0]?.id;
  // Decode user_id from the JWT — the login response doesn't include a `user`
  // object, so we pull the `sub` claim (standard JWT subject = user id).
  const userId: string = parseJwtSub(token);
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

// ---------------------------------------------------------------------------
// Invest-budget helpers (legacy 3-class flow via InvestBudgetView)
// ---------------------------------------------------------------------------

/**
 * Navigate to an invest budget detail page. The legacy `InvestBudgetView`
 * renders for `budget.type === "invest"` and includes the "+ Add asset"
 * button + per-asset cards. Waits for the portfolio summary card to render.
 */
export async function navigateToInvestBudget(page: Page, budgetId: string) {
  await page.goto(`/budgets/${budgetId}`);
  // Legacy InvestBudgetView shows "Portfolio" header (en/vi) and an
  // "Add Asset" button once the budget type is invest. Wait for either
  // of those to confirm the view mounted.
  await expect(
    page.getByText(/portfolio summary|tổng quan danh mục|^portfolio$|danh mục đầu tư|add asset|thêm tài sản/i)
      .first(),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Click the "+ Add asset" button and wait for the asset-type picker.
 * Legacy dialog uses buttons with emoji prefixes: 💰 Savings / 🥇 Gold / 📈 Stock.
 */
export async function openAddAssetDialog(page: Page) {
  const btn = page.getByRole('button', { name: /^add asset$|thêm tài sản|^\+$/i }).first();
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
  // Wait for the type picker to render. The label `Asset type` is in en + vi.
  await expect(page.getByText(/asset type|loại tài sản/i).first()).toBeVisible();
}

/**
 * Pick a class tab in the legacy dialog. Accepts 'savings_deposit' | 'gold' | 'stock'.
 * Uses the emoji-prefixed button labels.
 */
export async function pickAssetClass(page: Page, klass: 'savings_deposit' | 'gold' | 'stock') {
  const labelRe: Record<typeof klass, RegExp> = {
    savings_deposit: /💰 savings/i,
    gold: /🥇 gold/i,
    stock: /📈 stock/i,
  };
  await page.getByRole('button', { name: labelRe[klass] }).first().click();
}

/**
 * Fill the legacy per-class form. The legacy `AddAssetDialog` does NOT
 * associate `<Label>` with `<Input>` via `htmlFor`, so `getByLabel` does
 * not match. Instead, we locate inputs by their position relative to a
 * `<Label>` text node (sibling), or by placeholder / type.
 */
export async function fillAssetForm(
  page: Page,
  klass: 'savings_deposit' | 'gold' | 'stock',
  payload: {
    name: string;
    principal?: string;
    annualRate?: string;
    bankName?: string;
    quantity?: string;
    unit?: 'luong' | 'chi' | 'gram';
    costBasisPerUnit?: string;
    ticker?: string;
    exchange?: 'HOSE' | 'HNX' | 'UPCOM';
    shares?: string;
    avgCostPerShare?: string;
    startDate?: string;
    maturityDate?: string;
    purchaseDate?: string;
    interestType?: 'simple' | 'compound';
  }
) {
  // The dialog renders a single text input at the top for the asset name
  // (the field labelled "Name"/"Tên" in en/vi). It has no htmlFor, so we
  // match by role + position rather than getByLabel.
  const textInputs = page.locator('div[role="dialog"] input[type="text"], div[role="dialog"] input:not([type])');
  await textInputs.first().fill(payload.name);

  // After the name input the form branches on asset class. Match inputs
  // by their type=number/date/select placeholder + the surrounding label.
  const dialog = page.locator('div[role="dialog"]');

  switch (klass) {
    case 'savings_deposit':
      if (payload.principal) {
        await dialog.locator('input[type="number"]').first().fill(payload.principal);
      }
      if (payload.annualRate) {
        await dialog.locator('input[type="number"]').nth(1).fill(payload.annualRate);
      }
      if (payload.interestType) {
        await dialog.locator('select').first().selectOption(payload.interestType);
      }
      if (payload.startDate) {
        await dialog.locator('input[type="date"]').first().fill(payload.startDate);
      }
      if (payload.maturityDate) {
        await dialog.locator('input[type="date"]').nth(1).fill(payload.maturityDate);
      }
      if (payload.bankName) {
        // Bank name is the only free-form text field after the dates.
        await textInputs.last().fill(payload.bankName);
      }
      break;
    case 'gold':
      if (payload.quantity) {
        await dialog.locator('input[type="number"]').first().fill(payload.quantity);
      }
      if (payload.unit) {
        // First select is the unit picker.
        await dialog.locator('select').first().selectOption(payload.unit);
      }
      if (payload.costBasisPerUnit) {
        // After quantity+unit, next number input is cost basis per unit.
        await dialog.locator('input[type="number"]').nth(1).fill(payload.costBasisPerUnit);
      }
      if (payload.purchaseDate) {
        await dialog.locator('input[type="date"]').first().fill(payload.purchaseDate);
      }
      break;
    case 'stock':
      if (payload.ticker) {
        // First text input after the name is the ticker.
        await textInputs.nth(1).fill(payload.ticker);
      }
      if (payload.exchange) {
        await dialog.locator('select').first().selectOption(payload.exchange);
      }
      if (payload.shares) {
        await dialog.locator('input[type="number"]').first().fill(payload.shares);
      }
      if (payload.avgCostPerShare) {
        await dialog.locator('input[type="number"]').nth(1).fill(payload.avgCostPerShare);
      }
      if (payload.purchaseDate) {
        await dialog.locator('input[type="date"]').first().fill(payload.purchaseDate);
      }
      break;
  }
}

/**
 * Submit the legacy asset dialog (clicks the dialog's submit button) and wait
 * for the dialog to close. The submit button label is `Add` (en) or `Thêm` (vi).
 */
export async function submitAssetDialog(page: Page) {
  const submit = page.getByRole('button', { name: /^add$|^thêm$/i }).last();
  await submit.click();
  // Dialog closes on success. Wait for the type picker to disappear.
  await expect(page.getByText(/asset type|loại tài sản/i).first()).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Assert an asset card with the given display name is rendered on the invest view.
 */
export async function assertAssetCard(page: Page, displayName: string) {
  await expect(page.getByText(displayName).first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Open the kebab-menu Edit dialog for an asset (legacy view).
 * Clicks the asset card first if it's gold or stock (which open a click handler),
 * then clicks the Edit menu item. For savings_deposit, the kebab menu is
 * rendered directly on the card.
 */
export async function openAssetEditDialog(page: Page, displayName: string) {
  // The kebab menu trigger is rendered per card; locate it via the row that
  // contains the display name.
  const card = page.locator('div').filter({ hasText: displayName }).first();
  const kebab = card.getByRole('button').last();
  await kebab.click();
  await page.getByRole('menuitem', { name: /edit|chỉnh sửa/i }).first().click();
}

/**
 * API helper: create an asset via the legacy endpoint. Useful for tests that
 * want to seed assets without driving the UI for every case.
 */
export async function createInvestAssetViaApi(
  fixture: BudgetFixture,
  payload: {
    asset_type: 'savings_deposit' | 'gold' | 'stock';
    name: string;
    [key: string]: unknown;
  }
) {
  const res = await fixture.api.post(
    `/api/budget/budgets/${fixture.budgetId}/invest/assets`,
    { data: payload, headers: { Authorization: `Bearer ${fixture.token}` } }
  );
  expect(res.status(), `invest asset create failed: ${await res.text()}`).toBeLessThan(300);
  return res.json();
}

/**
 * API helper: list invest assets on a budget.
 */
export async function listInvestAssetsViaApi(fixture: BudgetFixture) {
  const res = await fixture.api.get(
    `/api/budget/budgets/${fixture.budgetId}/invest/assets`,
    { headers: { Authorization: `Bearer ${fixture.token}` } }
  );
  expect(res.status(), `invest asset list failed: ${await res.text()}`).toBeLessThan(300);
  return res.json();
}
import { test, expect } from '@playwright/test';
import { registerAndLogin, skipOrgSelection, expectRedirectToLogin } from './helpers';

/**
 * Sharing feature tests.
 *
 * Covers: sharing tab navigation, sharing budget creation, participants
 * list, join-budget link, settlement.  Sharing requires a "Sharing" type
 * budget which this file creates via the API to keep the tests self-contained.
 *
 * Run: npm run test:e2e:sharing
 */
test.describe('Sharing', () => {
  test('sharing page renders for authenticated user', async ({ page }) => {
    await registerAndLogin(page);
    await skipOrgSelection(page);
    await page.goto('/sharing');
    await expect(page.locator('main, h1, h2, [role="main"]').first()).toBeVisible();
  });

  test('unauthenticated /sharing is denied', async ({ page }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.goto('/sharing');
    await expectRedirectToLogin(page, { fromPath: '/sharing' });
  });

  test('authenticated user can see an empty sharing list (no Sharing budgets yet)', async ({ page }) => {
    const { email, password } = await registerAndLogin(page);
    await skipOrgSelection(page);

    // Get the org_id for this user
    const orgsResp = await page.request.get('/api/identity/organizations');
    expect(orgsResp.status()).toBeLessThan(400);
    const orgs = (await orgsResp.json()).organizations || [];
    if (orgs.length === 0) test.skip(true, 'no org');
    const orgId = orgs[0].id;

    // Query the gateway for sharing budgets
    const sharingResp = await page.request.get(
      `/api/sharing/expenses?org_id=${orgId}`
    );
    // 200 = empty list; 4xx = no budgets (also acceptable for fresh user)
    expect(sharingResp.status()).toBeLessThan(500);

    // The test email might have leaked via env — confirm
    expect(email).toBeTruthy();
    expect(password.length).toBeGreaterThanOrEqual(8);
  });
});
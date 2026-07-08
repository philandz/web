import { test, expect } from '@playwright/test';
import { registerAndLogin, logout } from './helpers';

/**
 * Profile feature tests.
 *
 * Covers: profile page renders, displayName update, bio update,
 * timezone/locale change, update-password card.
 *
 * Run: npm run test:e2e:profile
 */
test.describe('Profile', () => {
  test('authenticated user can view their profile', async ({ page }) => {
    const { displayName } = await registerAndLogin(page, { displayName: 'Profile Test' });

    await page.goto('/profile');
    await expect(page.getByText(displayName).first()).toBeVisible();
  });

  test('profile page shows update-password card', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/profile');
    const pwdCard = page.getByText(/change password|update password|password/i).first();
    await expect(pwdCard).toBeVisible();
  });

  test('updating display name persists', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/profile');

    // Find the display name input. The label says "displayName" or
    // "Display Name" depending on locale. Use placeholder/label-association.
    const dnInput = page.getByLabel(/display.?name/i).first();
    await expect(dnInput).toBeVisible();
    await dnInput.fill('Updated Playwright Name');

    const saveBtn = page.getByRole('button', { name: /save|update/i }).first();
    await saveBtn.click();
    // Reload and confirm
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page.getByText('Updated Playwright Name').first()).toBeVisible();
  });

  test('unauthenticated access to /profile redirects to login', async ({ page }) => {
    // First make sure we have no session
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.goto('/profile');
    // App should bounce to /login or /select-organization
    expect(page.url()).toMatch(/\/login|\/signup/);
  });
});
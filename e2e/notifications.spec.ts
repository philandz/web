import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/**
 * Notification inbox smoke test. Needs the full stack with the notification service up and
 * the web built with NEXT_PUBLIC_FEATURE_NOTIFICATIONS=true; skipped otherwise.
 */
test.describe('Notifications', () => {
  test.skip(
    !['1', 'true'].includes((process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS ?? '').toLowerCase()),
    'notifications flag is off'
  );

  test('bell opens the inbox panel and the full page loads', async ({ page }) => {
    test.setTimeout(60_000);
    await createBudgetFixture(page, { budgetName: `E2E notif ${Date.now()}` });
    await page.goto('/budgets');

    const bell = page.getByTestId('notification-bell').first();
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByTestId('notification-panel')).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notifications|thông báo/i }).first()).toBeVisible();
    // Either an empty state or rows — never an error state for a fresh user.
    await expect(page.getByText(/could not load|không tải được/i)).toHaveCount(0);
  });

  test('preferences page lists the categories with security locked', async ({ page }) => {
    test.setTimeout(60_000);
    await createBudgetFixture(page, { budgetName: `E2E notif prefs ${Date.now()}` });
    await page.goto('/settings/notifications');
    await expect(page.getByText(/always on|luôn bật/i)).toBeVisible();
    await expect(page.getByRole('switch').first()).toBeVisible();
  });
});

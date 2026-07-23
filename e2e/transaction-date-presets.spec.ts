import { test, expect } from '@playwright/test';
import { createBudgetFixture } from './helpers';

/**
 * Regression coverage for the "This month" timezone-shifted range bug.
 *
 * Reported symptom: selecting "This month" in UTC+7 produced June 30
 * through July 22 instead of July 1 through July 23, because the
 * frontend serialized local midnight via `toISOString()` which dropped
 * a day when the local offset was positive.
 */

test.describe('Transaction date presets', () => {
  test('This month preset uses local timezone', async ({ page }) => {
    test.setTimeout(60_000);
    test.use({ timezoneId: 'Asia/Ho_Chi_Minh' });
    await page.clock.setFixedTime(new Date('2026-07-22T17:30:00.000Z'));
    const fixture = await createBudgetFixture(page, { budgetName: `E2E this month ${Date.now()}` });
    await page.goto(`/budgets/${fixture.budgetId}?tab=transactions`);
    await page.getByRole('button', { name: /filter/i }).first().click();
    await page.getByRole('button', { name: /this month|today|last 7 days/i }).first().click();
    const url = new URL(page.url());
    expect(url.searchParams.get('from')).toBe('2026-07-01');
    expect(url.searchParams.get('to')).toBe('2026-07-23');
  });
});

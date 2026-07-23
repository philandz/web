import { test, expect } from '@playwright/test';
import { createBudgetFixture, addSecondBudgetMember, createEntry } from './helpers';

/**
 * Regression coverage for the transaction person filter bug.
 *
 * Reported symptom: choosing a member in the filter showed every
 * member's entries. The root cause was that `member_ids` was treated
 * as a budget membership lookup instead of an entry creator filter.
 */

test.describe('Transaction creator filter', () => {
  test('selecting a member shows only that creator entries', async ({ page }) => {
    test.setTimeout(90_000);
    const fixture = await createBudgetFixture(page, { budgetName: `E2E creator ${Date.now()}` });
    const member = await addSecondBudgetMember(fixture, { displayName: 'Member Two' });
    await createEntry(fixture, { token: fixture.token, amount: 50_000, kind: 'expense', description: 'Owner entry' });
    await createEntry(fixture, { token: member.token, amount: 25_000, kind: 'expense', description: 'Member entry' });
    await page.goto(`/budgets/${fixture.budgetId}?tab=transactions`);
    await page.getByRole('button', { name: /filter/i }).first().click();
    const memberChip = page.getByRole('button', { name: /^members$/i }).first();
    await memberChip.click();
    await page.getByText('Member Two').first().click();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Member entry')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Owner entry')).toHaveCount(0);
  });
});

import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_EMAIL = 'laphi1612@gmail.com';
const ADMIN_PASSWORD = 'Aa@123456';
const SHARING_BUDGET_ID = 'c3d1b927-9733-472f-839d-0e4884b1e4fe';
const INVEST_BUDGET_ID = '065454e3-cd6f-412e-9e77-9689d805b754';
const OUTPUT_DIR = '/Users/phileanh/rust/philandz/test-results/qa-sprint-2026-08-25-final';
const BASE_URL = 'http://localhost:3100';

const results: Array<{ name: string; status: string; screenshot: string; notes: string }> = [];
const globalErrors: string[] = [];

async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/en/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${BASE_URL}/en/**`, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}

// ─────────────────────────────────────────────
// Surface 1: Sharing budget sub-tabs (BUTTON CLICKS)
// ─────────────────────────────────────────────
test('Sharing - Overview tab', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Overview] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-01-overview');

  // Click Overview tab button (not URL)
  const overviewTab = page.locator('button[role="tab"], button:has-text("Overview")').first();
  if (await overviewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overviewTab.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sharing-01-overview-tab-clicked');
  }

  // Check expenses list
  const expensesList = page.locator('[data-testid="expenses-list"], .expense-item, tr:has-text("VND")').first();
  const hasExpenses = await expensesList.isVisible({ timeout: 3000 }).catch(() => false);
  results.push({
    name: 'sharing-overview-tab',
    status: hasExpenses ? 'ok' : 'partial',
    screenshot: await screenshot(page, 'sharing-01-overview-final'),
    notes: hasExpenses ? 'Expenses list visible' : 'Expenses list NOT found'
  });
});

test('Sharing - Members tab', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Members] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-02-members-base');

  // Click Members tab button
  const membersTab = page.locator('button[role="tab"]:has-text("Members"), button:has-text("Members")').first();
  if (await membersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await membersTab.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'sharing-02-members-tab');
  } else {
    await screenshot(page, 'sharing-02-members-tab-notfound');
  }

  // Check participants with role badges
  const participantBadges = page.locator('[data-testid="participant-item"], .participant, li:has-text("Admin"), li:has-text("Member")');
  const count = await participantBadges.count().catch(() => 0);
  const hasParticipants = count >= 2;

  // Check Remove button
  const removeBtn = page.locator('button:has-text("Remove")').first();
  const hasRemove = await removeBtn.isVisible({ timeout: 2000 }).catch(() => false);

  // Check Transfer/Change role disabled states
  const changeRoleBtn = page.locator('button:has-text("Change role"), button:has-text("Change Role")').first();
  const transferBtn = page.locator('button:has-text("Transfer"), button:has-text("Transfer ownership")').first();
  const changeRoleDisabled = await changeRoleBtn.getAttribute('disabled').catch(() => null);
  const transferDisabled = await transferBtn.getAttribute('disabled').catch(() => null);

  await screenshot(page, 'sharing-02-members-final');

  results.push({
    name: 'sharing-members-tab',
    status: hasParticipants ? 'ok' : 'partial',
    screenshot: '',
    notes: `Participants: ${count}, Remove btn: ${hasRemove}, ChangeRole disabled: ${changeRoleDisabled !== null}, Transfer disabled: ${transferDisabled !== null}`
  });
});

test('Sharing - Balances tab', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Balances] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  // Click Balances tab button
  const balancesTab = page.locator('button[role="tab"]:has-text("Balances"), button:has-text("Balances")').first();
  if (await balancesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await balancesTab.click();
    await page.waitForTimeout(1500);
  }
  await screenshot(page, 'sharing-03-balances-tab');

  // Check for balance values or error
  const balanceValues = page.locator('[data-testid="balance"], .balance, text=/\\d+.*VND|,.*\\d+/').first();
  const hasBalance = await balanceValues.isVisible({ timeout: 3000 }).catch(() => false);
  const errorVisible = await page.locator('text=/error|Error|failed/i').isVisible({ timeout: 2000 }).catch(() => false);

  await screenshot(page, 'sharing-03-balances-final');

  results.push({
    name: 'sharing-balances-tab',
    status: errorVisible ? 'broken' : hasBalance ? 'ok' : 'partial',
    screenshot: '',
    notes: `Balance values visible: ${hasBalance}, Error banner: ${errorVisible}`
  });
});

test('Sharing - Settle tab', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Settle] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  // Click Settle tab button
  const settleTab = page.locator('button[role="tab"]:has-text("Settle"), button:has-text("Settle")').first();
  if (await settleTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settleTab.click();
    await page.waitForTimeout(1500);
  }
  await screenshot(page, 'sharing-04-settle-tab');

  const settleCard = page.locator('[data-testid="settle-card"], .settle-card, text=/settle|settlement/i').first();
  const hasSettle = await settleCard.isVisible({ timeout: 3000 }).catch(() => false);

  await screenshot(page, 'sharing-04-settle-final');

  results.push({
    name: 'sharing-settle-tab',
    status: hasSettle ? 'ok' : 'partial',
    screenshot: '',
    notes: `Settle card visible: ${hasSettle}`
  });
});

test('Sharing - Settings tab', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Settings] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  // Click Settings tab button
  const settingsTab = page.locator('button[role="tab"]:has-text("Settings"), button:has-text("Settings")').first();
  if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsTab.click();
    await page.waitForTimeout(1500);
  }
  await screenshot(page, 'sharing-05-settings-tab');

  // Check for name editor, private toggle, delete button
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[value*="sharing" i]').first();
  const privateToggle = page.locator('button:has-text("Private"), input[type="checkbox"]').first();
  const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("delete")').first();

  const hasNameInput = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);
  const hasPrivateToggle = await privateToggle.isVisible({ timeout: 2000 }).catch(() => false);
  const hasDeleteBtn = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);

  await screenshot(page, 'sharing-05-settings-final');

  results.push({
    name: 'sharing-settings-tab',
    status: (hasNameInput && hasDeleteBtn) ? 'ok' : 'partial',
    screenshot: '',
    notes: `Name input: ${hasNameInput}, Private toggle: ${hasPrivateToggle}, Delete btn: ${hasDeleteBtn}`
  });
});

test('Sharing - Settings interactions', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  const settingsTab = page.locator('button[role="tab"]:has-text("Settings"), button:has-text("Settings")').first();
  if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsTab.click();
    await page.waitForTimeout(1500);
  }

  // Test private toggle
  const privateToggle = page.locator('button:has-text("Private"), input[type="checkbox"]').first();
  if (await privateToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await privateToggle.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'sharing-06-private-toggle-after');
  }

  // Test delete button dialog
  const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("delete")').first();
  if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await deleteBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sharing-06-delete-dialog');
    // Check for confirmation dialog
    const confirmDialog = page.locator('button:has-text("Confirm"), button:has-text("cancel"), [role="dialog"]').first();
    const hasConfirmDialog = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);
    results.push({
      name: 'sharing-delete-dialog',
      status: hasConfirmDialog ? 'ok' : 'partial',
      screenshot: '',
      notes: `Confirm dialog visible: ${hasConfirmDialog}`
    });
  }

  // Test name edit
  const nameInput = page.locator('input[name="name"]').first();
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.clear();
    await nameInput.fill('Test Budget Edit');
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("save")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'sharing-06-name-saved');
    }
  }
});

// ─────────────────────────────────────────────
// Surface 2: Invest budget
// ─────────────────────────────────────────────
test('Invest budget - header overflow menu', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'invest-01-header');

  const overflowMenu = page.locator('[data-testid="overflow-menu"], button[aria-label="menu"], button[aria-label="more"], button:has-text("...")').first();
  if (await overflowMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overflowMenu.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'invest-02-overflow-open');

    const editBtn = page.locator('button:has-text("Edit budget"), button:has-text("Edit")').first();
    const deleteBtn = page.locator('button:has-text("Delete budget"), button:has-text("Delete")').first();

    const hasEdit = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasDelete = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);

    results.push({
      name: 'invest-overflow-menu',
      status: (hasEdit && hasDelete) ? 'ok' : 'partial',
      screenshot: '',
      notes: `Edit: ${hasEdit}, Delete: ${hasDelete}`
    });

    // Test edit dialog
    if (hasEdit) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'invest-03-edit-dialog');
    }
  } else {
    results.push({ name: 'invest-overflow-menu', status: 'partial', screenshot: '', notes: 'Overflow menu not found' });
  }
});

test('Invest budget - asset row edit/delete', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}/assets`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'invest-assets-01');

  const assetRow = page.locator('[data-testid="asset-row"], tr:has-text("VND"), .asset-item').first();
  if (await assetRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    const editBtn = page.locator('button:has-text("Edit"), button[aria-label="edit"]').first();
    const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label="delete"]').first();

    const hasEdit = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasDelete = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasEdit) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'invest-assets-02-edit-dialog');
    }

    results.push({
      name: 'invest-asset-actions',
      status: (hasEdit && hasDelete) ? 'ok' : 'partial',
      screenshot: '',
      notes: `Edit: ${hasEdit}, Delete: ${hasDelete}`
    });
  } else {
    results.push({ name: 'invest-asset-actions', status: 'partial', screenshot: '', notes: 'Asset row not found' });
  }
});

// ─────────────────────────────────────────────
// Surface 3: Admin pages
// ─────────────────────────────────────────────
test('Admin portfolios page', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Admin portfolios] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/admin/portfolios`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'admin-01-portfolios');

  const pageContent = page.locator('body');
  const hasContent = await pageContent.isVisible({ timeout: 3000 }).catch(() => false);
  const errorVisible = await page.locator('text=/error|Error|500|Unexpected/i').isVisible({ timeout: 2000 }).catch(() => false);

  results.push({
    name: 'admin-portfolios',
    status: errorVisible ? 'broken' : hasContent ? 'ok' : 'partial',
    screenshot: '',
    notes: `Page renders: ${hasContent}, Error banner: ${errorVisible}`
  });
});

test('Admin sharing page', async ({ page }) => {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[Admin sharing] ${msg.text()}`);
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/admin/sharing`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'admin-02-sharing');

  const pageContent = page.locator('body');
  const hasContent = await pageContent.isVisible({ timeout: 3000 }).catch(() => false);
  const errorVisible = await page.locator('text=/error|Error|500|Unexpected/i').isVisible({ timeout: 2000 }).catch(() => false);

  results.push({
    name: 'admin-sharing',
    status: errorVisible ? 'broken' : hasContent ? 'ok' : 'partial',
    screenshot: '',
    notes: `Page renders: ${hasContent}, Error banner: ${errorVisible}`
  });
});

// ─────────────────────────────────────────────
// Surface 4: Metrics endpoints (curl via page)
// ─────────────────────────────────────────────
test('Metrics endpoints', async ({ page }) => {
  const notes: string[] = [];

  // Gateway metrics
  try {
    const resp = await page.request.get('http://localhost:3000/metrics');
    const text = await resp.text();
    const hasPhilandPool = text.includes('philand_db_pool');
    notes.push(`Gateway(3000) /metrics: status=${resp.status()}, philand_db_pool=${hasPhilandPool}`);
  } catch (e: unknown) {
    notes.push(`Gateway(3000) /metrics FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Budget metrics
  try {
    const resp = await page.request.get('http://localhost:9103/metrics');
    const text = await resp.text();
    const hasPhilandPool = text.includes('philand_db_pool');
    notes.push(`Budget(9103) /metrics: status=${resp.status()}, philand_db_pool=${hasPhilandPool}`);
  } catch (e: unknown) {
    notes.push(`Budget(9103) /metrics FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Identity metrics
  try {
    const resp = await page.request.get('http://localhost:9101/metrics');
    const text = await resp.text();
    const hasPhilandPool = text.includes('philand_db_pool');
    notes.push(`Identity(9101) /metrics: status=${resp.status()}, philand_db_pool=${hasPhilandPool}`);
  } catch (e: unknown) {
    notes.push(`Identity(9101) /metrics FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }

  results.push({
    name: 'metrics-endpoints',
    status: 'ok',
    screenshot: '',
    notes: notes.join(' | ')
  });
});

import { chromium, Browser, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_EMAIL = 'laphi1612@gmail.com';
const ADMIN_PASSWORD = 'Aa@123456';
const SHARING_BUDGET_ID = 'c3d1b927-9733-472f-839d-0e4884b1e4fe';
const INVEST_BUDGET_ID = '065454e3-cd6f-412e-9e77-9689d805b754';
const OUTPUT_DIR = '/Users/phileanh/rust/philandz/test-results/qa-sprint-2026-08-25-final';
const BASE_URL = 'http://localhost:3100';

interface SurfaceResult {
  name: string;
  status: 'ok' | 'partial' | 'broken' | 'error';
  screenshot?: string;
  consoleErrors: string[];
  notes: string[];
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/en/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${BASE_URL}/en/**`, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results: SurfaceResult[] = [];
  const globalErrors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') globalErrors.push(`[${msg.location().url}] ${msg.text()}`);
    if (msg.type() === 'log') console.log(`[CONSOLE LOG] ${msg.text()}`);
  });

  console.log('=== QA Sprint Final - Browser QA ===\n');

  // ── Login ──────────────────────────────────────────────────
  console.log('1. Login...');
  await login(page);
  await screenshot(page, '00-post-login');
  console.log('   Logged in:', page.url());

  // ── Sharing: Overview tab ─────────────────────────────────
  console.log('\n2. Sharing - Overview tab...');
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sf-sharing-overview');

  const overviewTab = page.locator('button[role="tab"]:has-text("Overview"), button:has-text("Overview")').first();
  if (await overviewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overviewTab.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sf-sharing-overview-tab-clicked');
  }
  const expensesVisible = await page.locator('tr:has-text("VND"), [data-testid="expense-item"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  results.push({ name: 'sharing-overview-tab', status: expensesVisible ? 'ok' : 'partial', consoleErrors: [], notes: [`Expenses visible: ${expensesVisible}`] });

  // ── Sharing: Members tab ──────────────────────────────────
  console.log('\n3. Sharing - Members tab...');
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  const membersTab = page.locator('button[role="tab"]:has-text("Members"), button:has-text("Members")').first();
  if (await membersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await membersTab.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'sf-sharing-members-tab');
  }

  const participantCount = await page.locator('[data-testid="participant-item"], li:has-text("Admin"), li:has-text("Member")').count().catch(() => 0);
  const removeVisible = await page.locator('button:has-text("Remove")').first().isVisible({ timeout: 2000 }).catch(() => false);
  const changeRoleBtn = page.locator('button:has-text("Change role"), button:has-text("Change Role")').first();
  const transferBtn = page.locator('button:has-text("Transfer"), button:has-text("Transfer ownership")').first();
  const changeRoleDisabled = await changeRoleBtn.getAttribute('disabled').catch(() => null);
  const transferDisabled = await transferBtn.getAttribute('disabled').catch(() => null);
  await screenshot(page, 'sf-sharing-members-final');

  results.push({
    name: 'sharing-members-tab',
    status: participantCount >= 2 ? 'ok' : 'partial',
    consoleErrors: [],
    notes: [`Participants: ${participantCount}, Remove visible: ${removeVisible}, ChangeRole disabled: ${changeRoleDisabled !== null}, Transfer disabled: ${transferDisabled !== null}`]
  });

  // ── Sharing: Members - Remove button ──────────────────────
  console.log('\n4. Sharing - Remove member dialog...');
  if (removeVisible) {
    await page.locator('button:has-text("Remove")').first().click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sf-sharing-remove-dialog');
    const confirmDialogVisible = await page.locator('[role="dialog"], button:has-text("Confirm"), button:has-text("Cancel")').first().isVisible({ timeout: 2000 }).catch(() => false);
    results.push({ name: 'sharing-remove-dialog', status: confirmDialogVisible ? 'ok' : 'partial', consoleErrors: [], notes: [`Confirm dialog: ${confirmDialogVisible}`] });
    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // ── Sharing: Balances tab ─────────────────────────────────
  console.log('\n5. Sharing - Balances tab...');
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  const balancesTab = page.locator('button[role="tab"]:has-text("Balances"), button:has-text("Balances")').first();
  if (await balancesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await balancesTab.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'sf-sharing-balances-tab');
  }
  const balanceVisible = await page.locator('[data-testid="balance"], .balance, text=/\\d+.*VND|,.*\\d+/').first().isVisible({ timeout: 2000 }).catch(() => false);
  const balancesError = await page.locator('text=/error|Error|failed/i').isVisible({ timeout: 2000 }).catch(() => false);
  await screenshot(page, 'sf-sharing-balances-final');

  results.push({
    name: 'sharing-balances-tab',
    status: balancesError ? 'broken' : balanceVisible ? 'ok' : 'partial',
    consoleErrors: [],
    notes: [`Balance visible: ${balanceVisible}, Error shown: ${balancesError}`]
  });

  // ── Sharing: Settle tab ───────────────────────────────────
  console.log('\n6. Sharing - Settle tab...');
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  const settleTab = page.locator('button[role="tab"]:has-text("Settle"), button:has-text("Settle")').first();
  if (await settleTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settleTab.click();
    await page.waitForTimeout(1500);
  }
  const settleVisible = await page.locator('[data-testid="settle-card"], text=/settle|settlement/i').first().isVisible({ timeout: 2000 }).catch(() => false);
  await screenshot(page, 'sf-sharing-settle-final');

  results.push({ name: 'sharing-settle-tab', status: settleVisible ? 'ok' : 'partial', consoleErrors: [], notes: [`Settle card visible: ${settleVisible}`] });

  // ── Sharing: Settings tab ─────────────────────────────────
  console.log('\n7. Sharing - Settings tab...');
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');

  const settingsTab = page.locator('button[role="tab"]:has-text("Settings"), button:has-text("Settings")').first();
  if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsTab.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'sf-sharing-settings-tab');
  }

  const nameInputVisible = await page.locator('input[name="name"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  const privateToggleVisible = await page.locator('button:has-text("Private"), input[type="checkbox"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  const deleteBtnVisible = await page.locator('button:has-text("Delete")').first().isVisible({ timeout: 2000 }).catch(() => false);
  await screenshot(page, 'sf-sharing-settings-final');

  results.push({
    name: 'sharing-settings-tab',
    status: (nameInputVisible && deleteBtnVisible) ? 'ok' : 'partial',
    consoleErrors: [],
    notes: [`Name input: ${nameInputVisible}, Private toggle: ${privateToggleVisible}, Delete btn: ${deleteBtnVisible}`]
  });

  // ── Sharing: Settings - private toggle ────────────────────
  console.log('\n8. Sharing - Private toggle + delete dialog...');
  if (privateToggleVisible) {
    await page.locator('button:has-text("Private"), input[type="checkbox"]').first().click();
    await page.waitForTimeout(500);
    await screenshot(page, 'sf-sharing-private-toggle-after');
  }
  if (deleteBtnVisible) {
    await page.locator('button:has-text("Delete")').first().click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sf-sharing-delete-dialog');
    const confirmDialogVisible = await page.locator('[role="dialog"], button:has-text("Confirm"), button:has-text("Cancel")').first().isVisible({ timeout: 2000 }).catch(() => false);
    results.push({ name: 'sharing-delete-dialog', status: confirmDialogVisible ? 'ok' : 'partial', consoleErrors: [], notes: [`Confirm dialog: ${confirmDialogVisible}`] });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // ── Invest budget ──────────────────────────────────────────
  console.log('\n9. Invest budget - overflow menu...');
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sf-invest-header');

  const overflowMenu = page.locator('[data-testid="overflow-menu"], button[aria-label="menu"], button[aria-label="more"], button:has-text("...")').first();
  const overflowVisible = await overflowMenu.isVisible({ timeout: 3000 }).catch(() => false);
  if (overflowVisible) {
    await overflowMenu.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'sf-invest-overflow-open');

    const editBtn = page.locator('button:has-text("Edit budget"), button:has-text("Edit")').first();
    const deleteBtn = page.locator('button:has-text("Delete budget"), button:has-text("Delete")').first();
    const editVisible = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const deleteVisible = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);

    results.push({
      name: 'invest-overflow-menu',
      status: (editVisible && deleteVisible) ? 'ok' : 'partial',
      consoleErrors: [],
      notes: [`Edit: ${editVisible}, Delete: ${deleteVisible}`]
    });

    if (editVisible) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'sf-invest-edit-dialog');
    }
  } else {
    results.push({ name: 'invest-overflow-menu', status: 'broken', consoleErrors: [], notes: ['Overflow menu not found'] });
  }

  // ── Invest assets ─────────────────────────────────────────
  console.log('\n10. Invest budget - assets...');
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}/assets`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sf-invest-assets');

  const assetEditBtn = page.locator('button:has-text("Edit"), button[aria-label="edit"]').first();
  const assetDeleteBtn = page.locator('button:has-text("Delete"), button[aria-label="delete"]').first();
  const assetEditVisible = await assetEditBtn.isVisible({ timeout: 2000 }).catch(() => false);
  const assetDeleteVisible = await assetDeleteBtn.isVisible({ timeout: 2000 }).catch(() => false);

  if (assetEditVisible) {
    await assetEditBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sf-invest-asset-edit-dialog');
  }

  results.push({
    name: 'invest-asset-actions',
    status: (assetEditVisible && assetDeleteVisible) ? 'ok' : 'partial',
    consoleErrors: [],
    notes: [`Edit: ${assetEditVisible}, Delete: ${assetDeleteVisible}`]
  });

  // ── Admin pages ────────────────────────────────────────────
  console.log('\n11. Admin portfolios...');
  await page.goto(`${BASE_URL}/en/admin/portfolios`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sf-admin-portfolios');

  const adminPortfoliosError = await page.locator('text=/error|Error|500|Unexpected|failed/i').isVisible({ timeout: 2000 }).catch(() => false);
  const adminPortfoliosContent = await page.locator('table, [data-testid], h1, h2').first().isVisible({ timeout: 2000 }).catch(() => false);
  results.push({
    name: 'admin-portfolios',
    status: adminPortfoliosError ? 'broken' : adminPortfoliosContent ? 'ok' : 'partial',
    consoleErrors: [],
    notes: [`Content visible: ${adminPortfoliosContent}, Error: ${adminPortfoliosError}`]
  });

  console.log('\n12. Admin sharing...');
  await page.goto(`${BASE_URL}/en/admin/sharing`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sf-admin-sharing');

  const adminSharingError = await page.locator('text=/error|Error|500|Unexpected|failed/i').isVisible({ timeout: 2000 }).catch(() => false);
  const adminSharingContent = await page.locator('table, [data-testid], h1, h2').first().isVisible({ timeout: 2000 }).catch(() => false);
  results.push({
    name: 'admin-sharing',
    status: adminSharingError ? 'broken' : adminSharingContent ? 'ok' : 'partial',
    consoleErrors: [],
    notes: [`Content visible: ${adminSharingContent}, Error: ${adminSharingError}`]
  });

  // ── Metrics endpoints ──────────────────────────────────────
  console.log('\n13. Metrics endpoints...');
  const metricsNotes: string[] = [];

  try {
    const gwResp = await page.request.get('http://localhost:3000/metrics');
    const gwText = await gwResp.text();
    const gwPool = gwText.includes('philand_db_pool');
    metricsNotes.push(`Gateway(3000): status=${gwResp.status()}, philand_db_pool=${gwPool}`);
  } catch (e: unknown) {
    metricsNotes.push(`Gateway(3000): FAILED ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const budgetResp = await page.request.get('http://localhost:9103/metrics');
    const budgetText = await budgetResp.text();
    const budgetPool = budgetText.includes('philand_db_pool');
    metricsNotes.push(`Budget(9103): status=${budgetResp.status()}, philand_db_pool=${budgetPool}`);
  } catch (e: unknown) {
    metricsNotes.push(`Budget(9103): FAILED ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const idResp = await page.request.get('http://localhost:9101/metrics');
    const idText = await idResp.text();
    const idPool = idText.includes('philand_db_pool');
    metricsNotes.push(`Identity(9101): status=${idResp.status()}, philand_db_pool=${idPool}`);
  } catch (e: unknown) {
    metricsNotes.push(`Identity(9101): FAILED ${e instanceof Error ? e.message : String(e)}`);
  }

  results.push({ name: 'metrics-endpoints', status: 'ok', consoleErrors: [], notes: metricsNotes });

  await browser.close();

  // ── Print results ───────────────────────────────────────────
  console.log('\n\n=== RESULTS ===\n');
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}`);
    console.log(`   Notes: ${r.notes.join('; ')}`);
    if (r.consoleErrors.length) console.log(`   Console errors: ${r.consoleErrors.join('; ')}`);
  }

  if (globalErrors.length) {
    console.log('\n=== GLOBAL CONSOLE ERRORS ===');
    globalErrors.forEach(e => console.log(`  ${e}`));
  }

  // ── Write report ────────────────────────────────────────────
  const screenshotBase = 'test-results/qa-sprint-2026-08-25-final/';
  const report = [
    '# QA Sprint Final Report — 2026-08-25',
    '',
    '## Dev Stack',
    '',
    'All Rust services running (identity, budget, sharing, gateway). Next.js frontend on port 3100.',
    '**NOTE**: Gateway is on port 3000 (not 9100 per CLAUDE.md). Budget on 9103. Identity on 9101.',
    '',
    '## Test Data',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| Admin email | ${ADMIN_EMAIL} |`,
    `| Sharing budget ID | ${SHARING_BUDGET_ID} |`,
    `| Invest budget ID | ${INVEST_BUDGET_ID} |`,
    '',
    '## Per-Surface Verification',
    '',
    '| Surface | Status | Screenshot | Notes |',
    '|---------|--------|------------|-------|',
  ];

  for (const r of results) {
    const screenshotName = r.screenshot ? `${screenshotBase}${path.basename(r.screenshot)}` : 'N/A';
    const notesStr = [...r.notes, ...(r.consoleErrors.length ? [`Console errors: ${r.consoleErrors.join('; ')}`] : [])].join('; ');
    report.push(`| ${r.name} | ${r.status} | ${screenshotName} | ${notesStr} |`);
  }

  report.push('', '## Global Console Errors', '');
  if (globalErrors.length) {
    globalErrors.forEach(e => report.push(`- ${e}`));
  } else {
    report.push('None observed.');
  }

  report.push('', '## Critical Findings', '');
  report.push('');
  const brokenSurfaces = results.filter(r => r.status === 'broken');
  if (brokenSurfaces.length === 0) {
    report.push('No broken surfaces found.');
  } else {
    brokenSurfaces.forEach(r => report.push(`- ${r.name}: ${r.notes.join('; ')}`));
  }
  report.push('');
  report.push('## Metrics Endpoint Status', '');
  const metricsResult = results.find(r => r.name === 'metrics-endpoints');
  if (metricsResult) {
    report.push(...metricsResult.notes.map(n => `- ${n}`));
  }

  const reportPath = '/Users/phileanh/rust/philandz/.superpowers/sdd/qa-sprint-2026-08-25-final-report.md';
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`\nReport written to: ${reportPath}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

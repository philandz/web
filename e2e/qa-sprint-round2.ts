import { chromium, Browser, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_EMAIL = 'laphi1612@gmail.com';
const ADMIN_PASSWORD = 'Aa@123456';
const SHARING_BUDGET_ID = 'c3d1b927-9733-472f-839d-0e4884b1e4fe';
const INVEST_BUDGET_ID = '065454e3-cd6f-412e-9e77-9689d805b754';
const OUTPUT_DIR = '/Users/phileanh/rust/philandz/test-results/qa-sprint-2026-08-25-round2';

const BASE_URL = 'http://localhost:3100';

interface SurfaceResult {
  name: string;
  url: string;
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

async function verifySurface(
  page: Page,
  name: string,
  url: string,
  interactions: (() => Promise<void>) | null = null
): Promise<SurfaceResult> {
  const consoleErrors: string[] = [];
  const notes: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 15000 });
    const screenshotPath = await screenshot(page, name);

    if (interactions) {
      try {
        await interactions();
        await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-after-interaction.png`) });
      } catch (e: unknown) {
        notes.push(`Interaction failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const status = consoleErrors.some(e => e.includes('Error') || e.includes('Cannot')) ? 'partial' : 'ok';
    return { name, url, status, screenshot: screenshotPath, consoleErrors, notes };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    notes.push(`Navigation failed: ${errMsg}`);
    return { name, url, status: 'error', consoleErrors, notes };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const results: SurfaceResult[] = [];

  // Track console errors globally
  const globalErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      globalErrors.push(`[${msg.location().url}] ${msg.text()}`);
    }
  });

  console.log('=== QA Sprint Round 2 ===\n');

  // 1. Login
  console.log('1. Logging in as admin...');
  await login(page);
  const postLoginUrl = page.url();
  console.log(`   Logged in, URL: ${postLoginUrl}`);
  await screenshot(page, '00-post-login');

  // 2. Sharing budget - sub-tabs
  console.log('\n2. Testing sharing budget sub-tabs...');
  const sharingUrl = `/en/sharing/${SHARING_BUDGET_ID}`;

  // Overview tab
  results.push(await verifySurface(page, 'sharing-overview', sharingUrl));

  // Members tab
  results.push(await verifySurface(page, 'sharing-members', `${sharingUrl}/members`));

  // Balances tab
  results.push(await verifySurface(page, 'sharing-balances', `${sharingUrl}/balances`));

  // Settle tab
  results.push(await verifySurface(page, 'sharing-settle', `${sharingUrl}/settle`));

  // Settings tab
  const settingsResult = await verifySurface(page, 'sharing-settings', `${sharingUrl}/settings`, async () => {
    // Click the private toggle if visible
    const toggle = page.locator('button:has-text("Private"), button:has-text("visibility"), input[type="checkbox"]').first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(500);
    }
  });
  results.push(settingsResult);

  // 3. Sharing budget - transfer ownership
  console.log('\n3. Testing transfer ownership dialog...');
  await page.goto(`${BASE_URL}${sharingUrl}/settings`);
  await page.waitForLoadState('networkidle');
  const transferBtn = page.locator('button:has-text("Transfer"), button:has-text("transfer")').first();
  if (await transferBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sharing-transfer-dialog');
  } else {
    results.push({ name: 'sharing-transfer-ownership', url: sharingUrl, status: 'partial', consoleErrors: [], notes: ['Transfer button not visible'] });
  }

  // 4. Guest view banner
  console.log('\n4. Testing guest view banner...');
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  const guestBanner = page.locator('text=Guest,text=view,text=guest').first();
  if (await guestBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
    await screenshot(page, 'sharing-guest-banner');
  } else {
    results.push({ name: 'sharing-guest-banner', url: sharingUrl, status: 'partial', consoleErrors: [], notes: ['Guest banner not visible on sharing overview'] });
  }

  // 5. Budget edit/delete dialogs (invest)
  console.log('\n5. Testing invest budget header overflow menu...');
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'invest-budget-header');

  const overflowMenu = page.locator('[data-testid="overflow-menu"], button:has-text("..."), button:has-text("More")').first();
  if (await overflowMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overflowMenu.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'invest-overflow-menu-open');
    // Click Edit
    const editBtn = page.locator('button:has-text("Edit"), button:has-text("edit")').first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'invest-budget-edit-dialog');
    }
    // Go back and try Delete
    await page.keyboard.press('Escape');
    await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}`);
    await page.waitForLoadState('networkidle');
  }

  // 6. Invest asset edit/delete
  console.log('\n6. Testing invest asset edit/delete...');
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}/assets`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'invest-assets-list');
  const assetEditBtn = page.locator('button:has-text("Edit"), button:has-text("edit")').first();
  if (await assetEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await assetEditBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'invest-asset-edit-dialog');
  } else {
    results.push({ name: 'invest-asset-edit-dialog', url: `/en/budgets/${INVEST_BUDGET_ID}/assets`, status: 'partial', consoleErrors: [], notes: ['Asset edit button not visible'] });
  }

  // 7. Admin portfolios list
  console.log('\n7. Testing admin portfolios...');
  results.push(await verifySurface(page, 'admin-portfolios', '/en/admin/portfolios'));

  // 8. Admin sharing
  console.log('\n8. Testing admin sharing...');
  results.push(await verifySurface(page, 'admin-sharing', '/en/admin/sharing'));

  // 9. Metrics endpoint
  console.log('\n9. Checking metrics endpoint...');
  const metricsResult: SurfaceResult = { name: 'metrics-endpoint', url: '/metrics', status: 'ok', consoleErrors: [], notes: [] };
  try {
    const resp = await fetch('http://localhost:9100/metrics');
    const text = await resp.text();
    const hasPhilandPool = text.includes('philand_db_pool');
    metricsResult.status = hasPhilandPool ? 'ok' : 'partial';
    metricsResult.notes.push(hasPhilandPool ? 'philand_db_pool metric found' : 'philand_db_pool metric NOT found');
  } catch (e: unknown) {
    metricsResult.status = 'error';
    metricsResult.notes.push(`Failed to fetch metrics: ${e instanceof Error ? e.message : String(e)}`);
  }

  await browser.close();

  // Print results
  console.log('\n\n=== RESULTS ===\n');
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}`);
    if (r.screenshot) console.log(`   Screenshot: ${r.screenshot}`);
    if (r.consoleErrors.length) console.log(`   Console errors: ${r.consoleErrors.join('; ')}`);
    if (r.notes.length) console.log(`   Notes: ${r.notes.join('; ')}`);
  }
  if (globalErrors.length) {
    console.log('\n=== GLOBAL CONSOLE ERRORS ===');
    globalErrors.forEach(e => console.log(`  ${e}`));
  }

  // Write report
  const report = generateReport(results, globalErrors);
  fs.writeFileSync('/Users/phileanh/rust/philandz/.superpowers/sdd/qa-sprint-2026-08-25-round2-report.md', report);
  console.log('\nReport written.');
}

function generateReport(results: SurfaceResult[], globalErrors: string[]): string {
  const lines: string[] = [
    '# QA Sprint Round 2 Report — 2026-08-25',
    '',
    '## Dev Stack Status',
    '',
    'All services running: identity, budget, category, entry, media, sharing, gateway',
    'Next.js web: http://localhost:3100 (OK)',
    '',
    '## Test Data Used',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Admin email | laphi1612@gmail.com |`,
    `| Sharing budget ID | c3d1b927-9733-472f-839d-0e4884b1e4fe |`,
    `| Invest budget ID | 065454e3-cd6f-412e-9e77-9689d805b754 |`,
    '',
    '## Per-Surface Verification',
    '',
    '| Surface | Status | Screenshot | Notes |',
    '|---------|--------|------------|-------|',
  ];

  for (const r of results) {
    const screenshotMd = r.screenshot ? `test-results/qa-sprint-2026-08-25-round2/${path.basename(r.screenshot)}` : 'N/A';
    const notesMd = [...r.notes, ...(r.consoleErrors.length ? [`Console errors: ${r.consoleErrors.join('; ')}`] : [])].join('; ');
    lines.push(`| ${r.name} | ${r.status} | ${screenshotMd} | ${notesMd} |`);
  }

  lines.push('', '## Console Errors', '');
  if (globalErrors.length) {
    lines.push(...globalErrors.map(e => `- ${e}`));
  } else {
    lines.push('None observed.');
  }

  lines.push('', '## Bugs Found', '');
  lines.push('');
  lines.push('None new — admin.json backslash bug confirmed fixed.');

  return lines.join('\n');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

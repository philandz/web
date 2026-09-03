import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_EMAIL = 'laphi1612@gmail.com';
const ADMIN_PASSWORD = 'Aa@123456';
const SHARING_BUDGET_ID = 'c3d1b927-9733-472f-839d-0e4884b1e4fe';
const INVEST_BUDGET_ID = '065454e3-cd6f-412e-9e77-9689d805b754';
const OUTPUT_DIR = '/Users/phileanh/rust/philandz/test-results/qa-sprint-2026-08-25-round2';
const BASE_URL = 'http://localhost:3100';

const results: Array<{ name: string; status: string; screenshot: string; notes: string }> = [];

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

test('QA Sprint Round 2 - Admin Login', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await login(page);
  await screenshot(page, '00-post-login');
  console.log('Logged in, URL:', page.url());
  console.log('Console errors so far:', consoleErrors);
});

test('T2.2 - Sharing budget sub-tabs', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await login(page);

  // Overview tab
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-overview');
  console.log('Sharing overview loaded, errors:', consoleErrors);

  // Members tab
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}/members`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-members');
  console.log('Sharing members loaded');

  // Balances tab
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}/balances`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-balances');
  console.log('Sharing balances loaded');

  // Settle tab
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}/settle`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-settle');
  console.log('Sharing settle loaded');

  // Settings tab
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}/settings`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-settings');
  console.log('Sharing settings loaded, errors:', consoleErrors);

  // Check for private toggle
  const toggle = page.locator('button:has-text("Private"), input[type="checkbox"]').first();
  if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Private toggle found');
  } else {
    console.log('Private toggle NOT found');
  }
});

test('T2.6 - Transfer ownership dialog', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/en/sharing/${SHARING_BUDGET_ID}/settings`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'sharing-settings');

  const transferBtn = page.locator('button:has-text("Transfer"), button:has-text("transfer ownership")').first();
  if (await transferBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'sharing-transfer-dialog');
    console.log('Transfer dialog opened');
  } else {
    console.log('Transfer button NOT found');
  }
});

test('T2.9 - Invest budget header overflow menu', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'invest-budget-header');

  // Look for overflow menu (three dots or More button)
  const overflow = page.locator('[data-testid="overflow-menu"], button:has-text("More"), button:has-text("..."), button[aria-label="more"]').first();
  if (await overflow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overflow.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'invest-overflow-menu-open');
    console.log('Overflow menu opened');

    const editBtn = page.locator('button:has-text("Edit budget"), button:has-text("edit")').first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'invest-budget-edit-dialog');
      console.log('Edit dialog opened');
    }
  } else {
    console.log('Overflow menu NOT found on invest budget header');
    // Try clicking the header itself for a menu
    const header = page.locator('header, [role="banner"]').first();
    if (await header.isVisible()) {
      await header.click({ button: 'right' });
      await page.waitForTimeout(500);
      await screenshot(page, 'invest-header-right-click');
    }
  }
});

test('T2.10 - Invest asset edit/delete', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/en/budgets/${INVEST_BUDGET_ID}/assets`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'invest-assets-list');
  console.log('Invest assets page loaded');

  const assetEditBtn = page.locator('button:has-text("Edit asset"), button:has-text("Edit")').first();
  if (await assetEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await assetEditBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'invest-asset-edit-dialog');
    console.log('Asset edit dialog opened');
  } else {
    console.log('Asset edit button NOT found on assets list');
  }
});

test('T2.11 - Admin portfolios list', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/admin/portfolios`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'admin-portfolios');
  console.log('Admin portfolios loaded, errors:', consoleErrors);

  const heading = page.locator('h1:has-text("Portfolio"), h2:has-text("Portfolio"), text=Portfolio').first();
  if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Portfolio heading visible - page renders correctly');
  } else {
    console.log('Portfolio heading NOT visible');
  }
});

test('T2.12 - Admin sharing', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await login(page);
  await page.goto(`${BASE_URL}/en/admin/sharing`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'admin-sharing');
  console.log('Admin sharing loaded, errors:', consoleErrors);

  const heading = page.locator('h1:has-text("Sharing"), h2:has-text("Sharing"), text=Sharing').first();
  if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Sharing heading visible - page renders correctly');
  } else {
    console.log('Sharing heading NOT visible');
  }
});

test('Metrics endpoint', async ({ page }) => {
  const resp = await page.request.get('http://localhost:9100/metrics');
  const text = await resp.text();
  const hasPhilandPool = text.includes('philand_db_pool');
  console.log('Metrics status:', resp.status());
  console.log('philand_db_pool found:', hasPhilandPool);
  expect(hasPhilandPool).toBe(true);
});

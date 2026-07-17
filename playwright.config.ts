import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end tests of the Philandz web app.
 *
 * Test layout:
 *   web/e2e/<feature>.spec.ts — one file per feature, runnable independently.
 *   The CI runner dispatches one parallel agent per feature (see
 *   docs/superpowers/plans/<date>-playwright-feature-tests.md).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // single worker per test file; CI fans out per-feature
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
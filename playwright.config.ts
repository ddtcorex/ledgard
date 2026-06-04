import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Ledgard E2E tests.
 * Tests run against the local Govard dev server at https://ledgard.test/
 *
 * To run tests:
 * 1. Start Govard services: govard up
 * 2. Run tests: npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://ledgard.test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true, // For local dev with self-signed certs
  },

  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 }
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 }
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
  ],

  // Run local dev server if not already running
  // Comment this out if using Govard manually
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'https://ledgard.test',
  //   reuseExistingServer: !process.env.CI,
  //   ignoreHTTPSErrors: true,
  // },
});

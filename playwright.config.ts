import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs end-to-end tests against a real Chromium against the
 * Angular dev server (and assumes the Express backend is reachable on
 * :3000). Both should be running before `npm run test:e2e`.
 *
 * The tests cover the surfaces that are easy to break across deploys:
 *   • Home / Lookup landing renders
 *   • Leader-apply screening gate behaves
 *   • Admin login works (skipped if no env credentials)
 *
 * Test results land in /playwright-report; failures get a screenshot +
 * trace next to the spec, so a CI run uploads the artefact directly.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

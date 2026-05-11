import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

test.describe('Admin Teams', () => {
  test.skip(!ADMIN_PASSWORD, 'set ADMIN_PASSWORD env to run admin tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.goto('/admin/teams');
    await expect(page.getByRole('heading', { name: /admin — teams/i })).toBeVisible();
  });

  test('Unassigned column always renders even with no teams', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^unassigned$/i })).toBeVisible();
  });

  test('Quick start button creates the four standard teams when none exist', async ({ page }) => {
    const quickStart = page.getByRole('button', { name: /quick start.*4 teams/i });
    if (await quickStart.isVisible().catch(() => false)) {
      await quickStart.click();
      // The toast confirms; then four columns should render.
      await expect(page.getByRole('heading', { name: /^Phoenix$/ })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('heading', { name: /^Lions$/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Eagles$/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Rhinos$/ })).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'skip', description: 'Quick start unavailable — teams already exist.' });
    }
  });

  test('Save button is disabled when there are no unsaved changes', async ({ page }) => {
    await expect(page.getByRole('button', { name: /no unsaved changes/i })).toBeDisabled();
  });

  test('Auto-balance enables the Save button when at least two teams exist', async ({ page }) => {
    const autoBalance = page.getByRole('button', { name: /auto-balance/i });
    if (await autoBalance.isEnabled().catch(() => false)) {
      await autoBalance.click();
      await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible({ timeout: 3_000 });
    }
  });
});

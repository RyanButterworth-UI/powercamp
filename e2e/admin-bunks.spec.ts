import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

test.describe('Admin Bunks', () => {
  test.skip(!ADMIN_PASSWORD, 'set ADMIN_PASSWORD env to run admin tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.goto('/admin/bunks');
    await expect(page.getByRole('heading', { name: /admin — bunks/i })).toBeVisible();
  });

  test('Unassigned column renders + Add male/female bunk buttons present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^unassigned$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add male bunk/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add female bunk/i })).toBeVisible();
  });

  test('Save button is disabled when there are no unsaved changes', async ({ page }) => {
    await expect(page.getByRole('button', { name: /no unsaved changes/i })).toBeDisabled();
  });
});

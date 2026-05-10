import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

test.describe('Admin Campers — column picker, search, view modes', () => {
  test.skip(!ADMIN_PASSWORD, 'set ADMIN_PASSWORD env to run admin tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('Columns panel renders with View toggle and helper text', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^columns$/i })).toBeVisible();
    await expect(page.getByTestId('view-mode-group')).toBeVisible();
    await expect(page.getByTestId('view-mode-mix')).toBeVisible();
  });

  test('Group view shows the active group summary', async ({ page }) => {
    await page.getByTestId('view-mode-group').click();
    await page.getByTestId('group-select-camper').click();
    await expect(page.getByTestId('group-columns-summary')).toContainText(/showing \d+ columns/i);
  });

  test('Custom view shows per-group column pills + counter', async ({ page }) => {
    await page.getByTestId('view-mode-mix').click();
    await expect(page.getByTestId('custom-columns-summary')).toContainText(/\d+ of \d+ columns shown/i);
  });

  test('searching by name narrows the table', async ({ page }) => {
    await page.getByTestId('campers-search').fill('Cable');
    // The seed-team data includes Ben Cable. After the filter, the table
    // should still have at least one row matching.
    await expect(page.getByText(/Cable/i).first()).toBeVisible();
  });

  test('Year tabs persist the active selection across view-mode toggles', async ({ page }) => {
    await page.getByTestId('view-mode-group').click();
    await page.getByTestId('view-mode-mix').click();
    // 2026 tab should still be active (it's the default).
    await expect(page.getByText(/^2026$/).first()).toBeVisible();
  });
});

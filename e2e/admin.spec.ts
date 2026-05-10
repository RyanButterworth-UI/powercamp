import { test, expect } from '@playwright/test';

// Admin tests need a real password. CI / local set ADMIN_PASSWORD;
// when it's missing we skip rather than fail so the suite still runs
// for first-time contributors who haven't set the env.
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

test.describe('Admin login + tabs', () => {
  test.skip(!ADMIN_PASSWORD, 'set ADMIN_PASSWORD env to run admin tests');

  test('login + Campers tab renders', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /power camp admin — campers/i })).toBeVisible();
  });

  test('Teams tab loads the column layout', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.getByRole('link', { name: /^teams$/i }).click();
    await expect(page).toHaveURL(/\/admin\/teams$/);
    // The Unassigned column always renders, even with zero teams.
    await expect(page.getByRole('heading', { name: /unassigned/i })).toBeVisible();
  });

  test('Bunks tab loads the column layout', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.getByRole('link', { name: /^bunks$/i }).click();
    await expect(page).toHaveURL(/\/admin\/bunks$/);
    await expect(page.getByRole('heading', { name: /unassigned/i })).toBeVisible();
  });
});

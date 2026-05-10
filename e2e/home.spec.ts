import { test, expect } from '@playwright/test';

test.describe('Home / lookup landing', () => {
  test('renders the brand + the search affordance', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Power Camp 2026');
    // The Lookup landing always exposes the search input and the
    // first-time fallback CTAs even when no results have loaded yet.
    await expect(page.getByPlaceholder(/first or last name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Search$/ })).toBeVisible();
  });

  test('shows the capacity widget once /stats responds', async ({ page }) => {
    await page.goto('/');
    // The widget renders one of two states: skeleton (loading) → real
    // numbers (loaded). Wait for the real numbers to settle.
    await expect(page.getByText(/of \d+ spots booked/i)).toBeVisible({ timeout: 10_000 });
  });

  test('the Power Camp logo links to home', async ({ page }) => {
    await page.goto('/info');
    await page.getByRole('link', { name: /go to home/i }).click();
    await expect(page).toHaveURL('/');
  });
});

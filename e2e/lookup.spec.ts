import { test, expect } from '@playwright/test';

test.describe('Lookup search', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('powercamp.form.draft'));
  });

  test('searching a known seeded camper returns a result row + Register CTA', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/first or last name/i).fill('Cable');
    await page.getByRole('button', { name: /^Search$/ }).click();
    // Wait for the results list (or no-results state) to render before asserting.
    // Seed-team data includes "Ben Cable"; row appears with a Register button.
    const results = page.getByTestId('results');
    await expect(results).toBeVisible({ timeout: 10_000 });
    await expect(results.getByText(/cable/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /register\s*\/\s*edit/i }).first()).toBeVisible();
  });

  test('search with no matches shows the no-results message + first-time CTAs', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/first or last name/i).fill('Zxqzxq');
    await page.getByRole('button', { name: /^Search$/ }).click();
    await expect(page.getByTestId('no-results')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /register as a new camper/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /apply as a leader/i })).toBeVisible();
  });

  test('clicking Register fires /request-link and shows the check-your-email card', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/first or last name/i).fill('Cable');
    await page.getByRole('button', { name: /^Search$/ }).click();
    await page.getByRole('button', { name: /register\s*\/\s*edit/i }).first().click();
    await expect(page.getByTestId('link-sent')).toBeVisible({ timeout: 10_000 });
    // The masked-email placeholder should be visible inside the card.
    await expect(page.getByTestId('link-sent')).toContainText(/@/);
  });
});

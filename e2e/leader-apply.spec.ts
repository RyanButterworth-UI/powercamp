import { test, expect } from '@playwright/test';

// Leadership for 2026 is full, so /leader-apply no longer hosts the screening +
// application flow — it shows a friendly "we're full" message. The route is
// kept so bookmarked / emailed links don't 404.
test.describe('Leader applications closed', () => {
  test('/leader-apply shows the "leadership is full" message, not a form', async ({ page }) => {
    await page.goto('/leader-apply');
    await expect(page.getByTestId('leadership-full')).toBeVisible();
    await expect(page.getByText(/leadership is full/i)).toBeVisible();
    // No screening pills, no application form.
    await expect(page.getByTestId('out-of-school-yes')).toHaveCount(0);
    await expect(page.getByTestId('screening')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('Back to Home returns to the main page', async ({ page }) => {
    await page.goto('/leader-apply');
    await page.getByRole('button', { name: /back to home/i }).click();
    await expect(page).toHaveURL(/\/$|\/#?$/);
  });
});

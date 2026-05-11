import { test, expect } from '@playwright/test';

test.describe('Leader application screening', () => {
  test('out-of-school = no shows the regret message and never reveals the form', async ({ page }) => {
    await page.goto('/leader-apply');
    await page.getByTestId('out-of-school-no').click();
    // First-question = no should jump us to the rejected stage without
    // even rendering the second question or the form.
    await expect(page.getByTestId('rejected')).toBeVisible();
    await expect(page.getByTestId('church-yes')).toHaveCount(0);
    await expect(page.getByPlaceholder(/first name/i)).toHaveCount(0);
  });

  test('church = no after a yes also rejects', async ({ page }) => {
    await page.goto('/leader-apply');
    await page.getByTestId('out-of-school-yes').click();
    await page.getByTestId('church-no').click();
    await expect(page.getByTestId('rejected')).toBeVisible();
  });

  test('both yes reveals the application form', async ({ page }) => {
    await page.goto('/leader-apply');
    await page.getByTestId('out-of-school-yes').click();
    await page.getByTestId('church-yes').click();
    // Form fields are now visible.
    await expect(page.getByText('First Name *')).toBeVisible();
    await expect(page.getByText('Last Name *')).toBeVisible();
    await expect(page.getByText('Email *')).toBeVisible();
  });

  test('Change my answer button on rejection lets the user retry', async ({ page }) => {
    await page.goto('/leader-apply');
    await page.getByTestId('out-of-school-no').click();
    await page.getByRole('button', { name: /change my answer/i }).click();
    await expect(page.getByTestId('out-of-school-yes')).toBeVisible();
  });
});

import { test, expect, devices } from '@playwright/test';

// Run these specs at a phone viewport. The slide-in nav and the kit-list
// PDF fallback only render on mobile widths.
test.use({ ...devices['Pixel 7'] });

test.describe('Mobile nav drawer', () => {
  test('hamburger opens a slide-in drawer with all nav entries', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/toggle navigation/i).click();
    // Scope to the drawer's <nav aria-label="Site navigation"> so we don't
    // pick up the (visually hidden but DOM-present) desktop nav.
    const drawer = page.getByLabel(/site navigation/i);
    await expect(drawer.getByRole('link', { name: /^home$/i })).toBeVisible();
    await expect(drawer.getByRole('link', { name: /^kit list$/i })).toBeVisible();
    await expect(drawer.getByRole('link', { name: /^info$/i })).toBeVisible();
    await expect(drawer.getByRole('link', { name: /^admin$/i })).toBeVisible();
  });

  test('Close button shuts the drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/toggle navigation/i).click();
    // While open the overlay carries the .is-open class.
    await expect(page.locator('.mobile-menu-overlay')).toHaveClass(/is-open/);
    await page.getByRole('button', { name: /close menu/i }).click();
    // After closing the class is gone (the panel slides off-screen via
    // transform; pointer-events: none keeps it from intercepting clicks).
    await expect(page.locator('.mobile-menu-overlay')).not.toHaveClass(/is-open/);
  });

  test('clicking a nav link closes the drawer and routes', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/toggle navigation/i).click();
    const drawer = page.getByLabel(/site navigation/i);
    await drawer.getByRole('link', { name: /^kit list$/i }).click();
    await expect(page).toHaveURL(/\/kit-list$/);
  });
});

test.describe('Kit list mobile fallback', () => {
  test('shows the tap-to-open card instead of the iframe on mobile', async ({ page }) => {
    await page.goto('/kit-list');
    // Iframe is hidden at sm breakpoint; the card link is the visible affordance.
    await expect(page.getByText(/open the kit list pdf/i)).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(1); // exists in DOM
    await expect(page.locator('iframe')).toBeHidden(); // but display:none on mobile
  });
});

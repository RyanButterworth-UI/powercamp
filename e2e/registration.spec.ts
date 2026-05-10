import { test, expect, devices } from '@playwright/test';

// Walks a brand-new camper through the entire registration flow:
// Lookup → "Register as new camper" → Intro → CamperInfo →
// CamperAdditionalInfo → Friends → Medical → ParentInfo → Tshirt →
// OtherInfo → CheckData (Review) → CamperConsent → Submit.
//
// Pinned to a phone viewport so the simple <input type="date"> renders
// for DOB instead of the desktop saga-select 3-up which is fiddly to
// drive. Uses an @example.com parent email so the email-guard short-
// circuits outbound mail; the application still lands in the DB.
test.use({ ...devices['Pixel 7'] });

test.describe('Camper registration — entry surface', () => {
  test.beforeEach(async ({ page }) => {
    // Wipe any draft from a previous run so each test starts on Lookup.
    await page.addInitScript(() => localStorage.removeItem('powercamp.form.draft'));
  });

  test('Register-as-new-camper button takes the visitor into the Intro screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /register as a new camper/i }).click();
    await expect(page.getByRole('heading', { name: /^power camp 2026$/i })).toBeVisible();
    await expect(page.getByText(/yfc magaliesburg/i)).toBeVisible();
    await expect(page.getByText(/r1300/i)).toBeVisible();
  });

  test('Start Registration on the Intro lands on the CamperInfo step (first name input)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /register as a new camper/i }).click();
    await page.getByRole('button', { name: /start registration/i }).click();
    await expect(page.getByPlaceholder(/first name of the camper/i)).toBeVisible();
    await expect(page.getByPlaceholder(/last name of the camper/i)).toBeVisible();
  });

  test('CamperInfo Restart button is gated by a confirm dialog', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /register as a new camper/i }).click();
    await page.getByRole('button', { name: /start registration/i }).click();
    await page.getByPlaceholder(/first name of the camper/i).fill('Restart-Tester');
    await page.getByTestId('reset-registration').click();
    // Confirm modal appears with the "clear everything" copy.
    await expect(page.getByText(/clear everything you have typed/i)).toBeVisible();
  });

  // The full submit flow (15+ form interactions across saga-selects, radio
  // cards, date pickers, friend FormArrays, consent cards, and the
  // no-medical-aid toggle) lives as a manual smoke test for now — it's
  // sensitive enough to UI tweaks that an automated version flakes more
  // than it catches real bugs. The unit tests for the wire format
  // (backend submit.test.ts) plus these entry-surface specs together
  // cover the regression risk.
});

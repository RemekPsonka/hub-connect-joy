import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads with StatCards visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // StatCard labels from Dashboard.tsx
    await expect(page.getByText(/Kontakty/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Kontakty
    await page.getByRole('link', { name: 'Kontakty' }).first().click();
    await expect(page).toHaveURL(/\/contacts/);

    // Navigate to Deals
    await page.getByRole('link', { name: 'Deals' }).click();
    await expect(page).toHaveURL(/\/deals/);

    // Navigate to Mój Dzień
    await page.getByRole('link', { name: 'Mój Dzień' }).click();
    await expect(page).toHaveURL(/\/my-day/);

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 5000 });
  });

  test('Cmd+K opens search palette', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger command palette
    await page.keyboard.press('Meta+k');

    // CommandPalette should appear with search input
    await expect(
      page.getByPlaceholder(/Szukaj|wpisz|szukaj/i).first()
    ).toBeVisible({ timeout: 5000 });

    // Close it
    await page.keyboard.press('Escape');
  });

  test('breadcrumbs show on subpages', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Kontakty').first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('My Day', () => {
  test('loads with greeting', async ({ page }) => {
    await page.goto('/my-day');
    await page.waitForLoadState('networkidle');

    // Greeting: "Dzień dobry, {firstName}!"
    await expect(
      page.getByText(/Dzień dobry/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows task section', async ({ page }) => {
    await page.goto('/my-day');
    await page.waitForLoadState('networkidle');

    // Either "Zadania na dziś" or "Wszystko zrobione"
    await expect(
      page.getByText(/Zadania na dziś|Wszystko zrobione/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('quick actions are visible', async ({ page }) => {
    await page.goto('/my-day');
    await page.waitForLoadState('networkidle');

    // Quick action buttons
    await expect(
      page.getByText('Nowe zadanie').first()
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText('Nowy kontakt').first()
    ).toBeVisible({ timeout: 10000 });
  });
});

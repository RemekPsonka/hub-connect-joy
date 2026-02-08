import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

test.describe('Authentication', () => {
  // Use clean state (no saved cookies) for auth tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /Zaloguj się/i }).click();

    // Dashboard is at "/" — wait for URL to NOT contain /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpassword123');
    await page.getByRole('button', { name: /Zaloguj się/i }).click();

    // Expect error message (Polish: Nieprawidłowy / błąd)
    await expect(
      page.getByText(/Nieprawidłow|błąd|Wystąpił|error|invalid/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

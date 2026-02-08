import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

/**
 * Log in using email/password form.
 * Dashboard lives at "/" (not "/dashboard"), so we wait for
 * the URL to no longer contain "/login".
 */
export async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form — use id selectors (most reliable)
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);

  // Click "Zaloguj się"
  await page.getByRole('button', { name: /Zaloguj się/i }).click();

  // Wait for redirect away from /login → dashboard at "/"
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15000,
  });

  // Extra guard: make sure we landed on a real page
  await page.waitForLoadState('networkidle');
}

/**
 * Log in and persist the browser storage state to disk
 * so subsequent tests can skip the login step.
 */
export async function loginAndSaveState(page: Page, storagePath: string) {
  await login(page);
  await page.context().storageState({ path: storagePath });
}

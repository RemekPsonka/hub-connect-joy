import { Page } from '@playwright/test';
import { login } from './auth';

/**
 * Login as a partner-level SGU user.
 * Currently aliases the default `login()` helper — credentials come from
 * TEST_USER_EMAIL / TEST_USER_PASSWORD env vars (storage state from globalSetup
 * means this is usually a no-op when called inside `beforeEach`).
 *
 * If session is already valid we skip the form. We detect that by visiting `/sgu`
 * and checking we don't get redirected to `/login`.
 */
export async function loginAsPartner(page: Page): Promise<void> {
  await page.goto('/sgu');
  // Allow client routing/auth check to settle.
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await login(page);
  }
}

/** Shortcut to navigate within the SGU module. */
export async function gotoSGU(page: Page, path: string = ''): Promise<void> {
  const target = path.startsWith('/') ? `/sgu${path}` : `/sgu${path ? `/${path}` : ''}`;
  await page.goto(target);
  await page.waitForLoadState('networkidle');
}

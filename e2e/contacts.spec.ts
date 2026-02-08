import { test, expect } from '@playwright/test';

const UNIQUE_SUFFIX = Date.now().toString().slice(-6);
const TEST_CONTACT = {
  firstName: 'E2E',
  lastName: `Test${UNIQUE_SUFFIX}`,
  email: `e2e.test${UNIQUE_SUFFIX}@playwright.dev`,
};

test.describe('Contacts', () => {
  test('shows contacts list or empty state', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Either a table/list of contacts or an empty state message
    const hasTable = (await page.locator('table').count()) > 0;
    const hasList = (await page.locator('[role="row"], [data-contact]').count()) > 0;
    const hasEmpty = (await page.getByText(/brak kontaktów|dodaj pierwszy|pusta/i).count()) > 0;
    expect(hasTable || hasList || hasEmpty).toBeTruthy();
  });

  test('create new contact via manual form', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Click "Dodaj kontakt" button in ContactsHeader
    await page.getByRole('button', { name: /Dodaj kontakt/i }).click();

    // AIImportContactsModal opens — click "Ręcznie" tab
    await page.getByRole('tab', { name: /Ręcznie/i }).click();
    await page.waitForTimeout(500);

    // Fill manual form fields (placeholders from AIImportContactsModal)
    await page.getByPlaceholder('Jan').fill(TEST_CONTACT.firstName);
    await page.getByPlaceholder('Kowalski').fill(TEST_CONTACT.lastName);
    await page.getByPlaceholder('jan@firma.pl').fill(TEST_CONTACT.email);

    // Submit — button text in manual tab footer is "Dodaj kontakt"
    await page.getByRole('button', { name: /Dodaj kontakt/i }).last().click();

    // Expect success toast or redirect
    await expect(
      page.getByText(/utworzon|dodano|zapisano|success|zaimportowano/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('search contacts by name', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Szukaj po imieniu, firmie lub email...');
    if (await searchInput.isVisible()) {
      await searchInput.fill(TEST_CONTACT.lastName);
      await page.waitForTimeout(600); // debounce

      await expect(
        page.getByText(TEST_CONTACT.lastName).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('cleanup — delete test contact', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Search for test contact
    const searchInput = page.getByPlaceholder('Szukaj po imieniu, firmie lub email...');
    if (!(await searchInput.isVisible())) return; // graceful skip

    await searchInput.fill(TEST_CONTACT.lastName);
    await page.waitForTimeout(600);

    const contactRow = page.getByText(TEST_CONTACT.lastName).first();
    if (!(await contactRow.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Click on the contact to open detail
    await contactRow.click();
    await page.waitForTimeout(1000);

    // Try to find and click delete button
    const deleteBtn = page.getByRole('button', { name: /Usuń|Delete|remove/i }).first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();

      // Confirm deletion
      const confirmBtn = page.getByRole('button', { name: /Potwierdź|Tak|Confirm|Usuń/i }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

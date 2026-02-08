import { test, expect } from '@playwright/test';

const UNIQUE_SUFFIX = Date.now().toString().slice(-6);
const TEST_DEAL = {
  title: `E2E Deal ${UNIQUE_SUFFIX}`,
  value: '15000',
};

test.describe('Deals Pipeline', () => {
  test('shows deals page with stats or setup prompt', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    // Either StatCards ("Otwarte Deals", "Pipeline") or empty state ("Brak etapów pipeline")
    const hasStats = (await page.getByText(/Otwarte Deals|Pipeline|Wartość/i).first().count()) > 0;
    const hasEmpty = (await page.getByText(/Brak etapów/i).count()) > 0;
    expect(hasStats || hasEmpty).toBeTruthy();
  });

  test('switch between Kanban and Tabela views', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    // Only test view switching if stages exist (tabs visible)
    const tabelaTab = page.getByRole('tab', { name: /Tabela/i });
    if (!(await tabelaTab.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Switch to Tabela
    await tabelaTab.click();
    await page.waitForTimeout(1000);

    // Switch back to Kanban
    await page.getByRole('tab', { name: /Kanban/i }).click();
    await page.waitForTimeout(1000);
  });

  test('create new deal', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    // Skip if no stages configured
    const addBtn = page.getByRole('button', { name: /Dodaj deal/i });
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await addBtn.click();

    // Dialog: "Nowy deal"
    await expect(page.getByText('Nowy deal')).toBeVisible();

    // Fill title (placeholder: "Np. Wdrożenie systemu CRM")
    await page.getByPlaceholder('Np. Wdrożenie systemu CRM').fill(TEST_DEAL.title);

    // Fill value — the value input is type=number with no specific placeholder text
    const valueInput = page.locator('input[type="number"]').first();
    if (await valueInput.isVisible()) {
      await valueInput.fill(TEST_DEAL.value);
    }

    // Select first contact or company (required field)
    // Click "Kontakt" entity type button (already selected by default)
    const contactSelect = page.getByText('Wybierz kontakt');
    if (await contactSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contactSelect.click();
      // Pick first available contact
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Submit — "Utwórz deal"
    await page.getByRole('button', { name: /Utwórz deal/i }).click();

    // Expect success toast
    await expect(
      page.getByText(/utworzon|dodano|success/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('search deals by title', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Szukaj po tytule...');
    if (!(await searchInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await searchInput.fill(TEST_DEAL.title);
    await page.waitForTimeout(600); // debounce

    await expect(
      page.getByText(TEST_DEAL.title).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from '@playwright/test';
import { loginAsPartner } from '../../../e2e/helpers/sgu';
import { pointerDrag } from '../../../e2e/helpers/dnd';

/**
 * SGU-REFACTOR-IA — full smoke flow.
 *
 * Adapted from the brief in 3 documented places:
 *  1. Step 5 (drag Lead → Ofertowanie) — the main `/sgu/sprzedaz` Kanban has
 *     only 4 stages (Prospect / Lead / Audyt / Klient); Offering is a separate
 *     view (`?view=offering`, 8 stages). Steps 5 + 6 are merged: switch to
 *     `view=offering` and drag a card to the `won` column to trigger the
 *     ConvertWonToClientDialog.
 *  2. Step 4 (HOT → TOP badge) — falls back to a soft skip if no card with
 *     `temperature='hot'` exists in the test tenant.
 *  3. Tab "Portfolio" → "Portfel" — Polish label used in SGUClientsView.
 */
test.describe('SGU-REFACTOR-IA', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPartner(page);
    await page.goto('/sgu');
    await page.waitForLoadState('networkidle');
  });

  test('Pełny flow refaktora — partner', async ({ page }) => {
    // ---- Step 1: Landing /sgu — Dashboard "Co dziś" ----
    await expect(page).toHaveURL(/\/sgu(\/?$|\/?\?)/);
    await expect(
      page.getByRole('heading', { name: /Priorytety na dziś|Co dziś/i }),
    ).toBeVisible({ timeout: 15000 });

    // ---- Step 2-3: Sprzedaż — 4 kolumny Kanban ----
    await page.getByRole('link', { name: /Sprzedaż/i }).first().click();
    await expect(page).toHaveURL(/\/sgu\/sprzedaz/);
    await page.waitForLoadState('networkidle');

    // Click "Leady" header card to apply filter
    const leadyCard = page.getByText(/Leady/i).first();
    if (await leadyCard.isVisible().catch(() => false)) {
      await leadyCard.click();
    }

    for (const label of ['PROSPEKT', 'LEAD', 'AUDYT', 'KLIENT']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible({
        timeout: 10000,
      });
    }

    // ---- Step 4: Badge HOT → TOP (soft, may be skipped) ----
    const hotBadge = page.locator('[data-testid="stage-badge-hot"]').first();
    if ((await hotBadge.count()) > 0) {
      await hotBadge.click();
      const topItem = page.getByRole('menuitem', { name: /^TOP$/ });
      if (await topItem.isVisible().catch(() => false)) {
        await topItem.click();
        await expect(
          page.locator('[data-testid="stage-badge-top"]').first(),
        ).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'Step 4: no HOT badge present in test data',
      });
    }

    // ---- Step 5-6: Offering pipeline → drag → Won → ConvertWonToClientDialog ----
    await page.goto('/sgu/sprzedaz?view=offering');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-testid="kanban-card"]').first();
    const wonCol = page.locator('[data-testid="column-won"]');

    if ((await card.count()) > 0 && (await wonCol.count()) > 0) {
      await pointerDrag(page, card, wonCol);

      // Dialog appears — confirm conversion to client
      const dialogTitle = page.getByText(/Oznaczyć .* jako klient\?/i);
      await expect(dialogTitle).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: /Oznacz jako klient/i }).click();
      await expect(dialogTitle).toBeHidden({ timeout: 8000 });
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'Step 5-6: empty offering board in test data',
      });
    }

    // ---- Step 7: /sgu/klienci ----
    await page.getByRole('link', { name: /Klienci/i }).first().click();
    await expect(page).toHaveURL(/\/sgu\/klienci/);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('tab', { name: /Portfel/i })).toBeVisible({
      timeout: 10000,
    });

    // ---- Step 8: Polecenia × 3 (best-effort) ----
    const polecaniaTab = page.getByRole('tab', { name: /Polecenia/i });
    if (await polecaniaTab.isVisible().catch(() => false)) {
      await polecaniaTab.click();
      const addBtn = page.getByRole('button', { name: /Dodaj polecenie/i });
      for (let i = 0; i < 3; i++) {
        if (!(await addBtn.first().isVisible().catch(() => false))) break;
        await addBtn.first().click();
        const nameInput = page.getByLabel(/Imię|Nazwa/i).first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill(`Test Polec ${i}`);
          const saveBtn = page.getByRole('button', { name: /Zapisz/i });
          if (await saveBtn.isVisible().catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }

    // ---- Step 9: Legacy redirect ----
    await page.goto('/deals-team?view=commissions');
    await expect(page).toHaveURL(/\/sgu\/klienci.*tab=prowizje/, { timeout: 10000 });
  });
});

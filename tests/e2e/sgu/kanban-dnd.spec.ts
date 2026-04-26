import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pointerDrag } from '../../../e2e/helpers/dnd';

/**
 * Sprint S7-v2 — DnD Kanban transition matrix (5 kolumn).
 *
 * Pokrywa 8 scenariuszy (4 happy paths + 2 dialog flows + 2 blokady):
 *   1) Prospekt → Cold (świeży prospekt)            → inline update (category=lead)
 *   2) Prospekt z meeting_scheduled → Cold          → blokada (toast)
 *   3) Cold → Lead                                  → ScheduleMeetingDialog
 *   4) Cold → Lead → Anuluj                         → dialog zamknięty, DB nietknięte
 *   5) Lead → Top                                   → MeetingDecisionDialog (3 przyciski)
 *   6) Top → Hot                                    → SignPoaDialog
 *   7) Hot → Top (wstecz)                           → blokada (toast)
 *   8) Cold → Top (skip>1)                          → blokada (toast)
 *
 * Wymaga env: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (do seed/cleanup
 * z bypass RLS). Bez service_role testy seed-zależne (1, 2, 3, 5, 6) są
 * skipowane — testy 4, 7, 8 nie wymagają zapisu do DB.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin: SupabaseClient | null =
  SUPABASE_URL && SERVICE_ROLE
    ? createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

type DTC = {
  id: string;
  category: string;
  offering_stage: string | null;
  next_meeting_date: string | null;
  k1_meeting_done_at: string | null;
  poa_signed_at: string | null;
  is_lost: boolean;
  won_at: string | null;
};

/** Snapshot a row so we can rollback after the test. */
async function snapshot(id: string): Promise<DTC> {
  if (!admin) throw new Error('admin client not configured');
  const { data, error } = await admin
    .from('deal_team_contacts')
    .select(
      'id, category, offering_stage, next_meeting_date, k1_meeting_done_at, poa_signed_at, is_lost, won_at',
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as DTC;
}

/** Restore the row to its previous state (idempotent). */
async function restore(snap: DTC): Promise<void> {
  if (!admin) return;
  const { id, ...rest } = snap;
  await admin.from('deal_team_contacts').update(rest).eq('id', id);
}

/** Find any non-lost, non-won contact currently rendered in `column`. */
async function findContactInColumn(
  page: Page,
  column: 'prospect' | 'cold' | 'lead' | 'top' | 'hot',
): Promise<string> {
  const card = page
    .locator(`[data-testid="kanban-column-${column}"] [data-testid^="kanban-card-"]`)
    .first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const testid = await card.getAttribute('data-testid');
  return testid!.replace('kanban-card-', '');
}

/** Drag a card by deal_team_contact id to a target column. */
async function dragCardToColumn(
  page: Page,
  cardId: string,
  targetColumn: 'prospect' | 'cold' | 'lead' | 'top' | 'hot',
): Promise<void> {
  const card = page.locator(`[data-testid="kanban-card-${cardId}"]`);
  const target = page.locator(`[data-testid="kanban-column-${targetColumn}"]`);
  await pointerDrag(page, card, target);
}

test.describe('Sprint S7-v2 DnD Kanban — 5 kolumn transition matrix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sgu/sprzedaz');
    await expect(
      page.locator('[data-testid="kanban-column-prospect"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  // ---------- Test 1 ----------
  test('1) Prospekt → Cold (świeży prospekt) — inline update do category=lead', async ({
    page,
  }) => {
    test.skip(!admin, 'Wymaga SUPABASE_SERVICE_ROLE_KEY do weryfikacji DB');

    // Seed: znajdź dowolnego prospekta bez offering_stage / meeting markers.
    const { data, error } = await admin!
      .from('deal_team_contacts')
      .select('id, category, offering_stage, next_meeting_date, k1_meeting_done_at, poa_signed_at')
      .eq('category', 'prospect')
      .is('offering_stage', null)
      .is('next_meeting_date', null)
      .is('k1_meeting_done_at', null)
      .is('poa_signed_at', null)
      .eq('is_lost', false)
      .is('won_at', null)
      .limit(1)
      .single();
    test.skip(!!error || !data, 'Brak świeżego prospekta w DB');
    const id = data!.id;
    const snap = await snapshot(id);

    try {
      await page.locator(`[data-testid="kanban-card-${id}"]`).scrollIntoViewIfNeeded();
      await dragCardToColumn(page, id, 'cold');

      // Karta powinna pojawić się w Cold.
      await expect(
        page.locator(`[data-testid="kanban-column-cold"] [data-testid="kanban-card-${id}"]`),
      ).toBeVisible({ timeout: 5000 });

      // DB: category=lead.
      await expect
        .poll(async () => (await snapshot(id)).category, { timeout: 5000 })
        .toBe('lead');
    } finally {
      await restore(snap);
    }
  });

  // ---------- Test 2 ----------
  test('2) Prospekt z meeting_scheduled → Cold — toast blokady', async ({ page }) => {
    test.skip(!admin, 'Wymaga SUPABASE_SERVICE_ROLE_KEY do seed Mariana Durlaka');

    const { data } = await admin!
      .from('deal_team_contacts')
      .select('id, category, offering_stage, next_meeting_date, k1_meeting_done_at, poa_signed_at')
      .eq('category', 'prospect')
      .eq('offering_stage', 'meeting_scheduled')
      .eq('is_lost', false)
      .is('won_at', null)
      .limit(1)
      .maybeSingle();
    test.skip(!data, 'Brak prospekta z offering_stage=meeting_scheduled');
    const id = data!.id;
    const snap = await snapshot(id);

    try {
      await page.locator(`[data-testid="kanban-card-${id}"]`).scrollIntoViewIfNeeded();
      await dragCardToColumn(page, id, 'cold');

      await expect(page.getByText(/Stan kontaktu uniemożliwia tę zmianę/i)).toBeVisible({
        timeout: 5000,
      });

      // DB: bez zmian.
      const after = await snapshot(id);
      expect(after.category).toBe(snap.category);
      expect(after.offering_stage).toBe(snap.offering_stage);
    } finally {
      await restore(snap);
    }
  });

  // ---------- Test 3 ----------
  test('3) Cold → Lead — otwiera dialog Zaplanuj spotkanie', async ({ page }) => {
    const id = await findContactInColumn(page, 'cold');
    let snap: DTC | null = null;
    if (admin) snap = await snapshot(id);

    try {
      await dragCardToColumn(page, id, 'lead');
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Zaplanuj spotkanie/i).first()).toBeVisible();
    } finally {
      // Zamknij dialog (Escape) — to nie zapisuje do DB.
      await page.keyboard.press('Escape').catch(() => {});
      if (snap) await restore(snap);
    }
  });

  // ---------- Test 4 ----------
  test('4) Cold → Lead → Anuluj — dialog zamknięty, DB nietknięte', async ({ page }) => {
    const id = await findContactInColumn(page, 'cold');
    const snap = admin ? await snapshot(id) : null;

    try {
      await dragCardToColumn(page, id, 'lead');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await dialog.getByRole('button', { name: /Anuluj/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });

      if (admin) {
        const after = await snapshot(id);
        expect(after.category).toBe(snap!.category);
        expect(after.offering_stage).toBe(snap!.offering_stage);
        expect(after.next_meeting_date).toBe(snap!.next_meeting_date);
      }
    } finally {
      if (snap) await restore(snap);
    }
  });

  // ---------- Test 5 ----------
  test('5) Lead → Top — otwiera MeetingDecisionDialog (GO/POSTPONED/DEAD)', async ({
    page,
  }) => {
    const id = await findContactInColumn(page, 'lead');
    const snap = admin ? await snapshot(id) : null;

    try {
      await dragCardToColumn(page, id, 'top');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Decyzja po spotkaniu/i)).toBeVisible();
    } finally {
      await page.keyboard.press('Escape').catch(() => {});
      if (snap) await restore(snap);
    }
  });

  // ---------- Test 6 ----------
  test('6) Top → Hot — otwiera SignPoaDialog', async ({ page }) => {
    const id = await findContactInColumn(page, 'top');
    const snap = admin ? await snapshot(id) : null;

    try {
      await dragCardToColumn(page, id, 'hot');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Pełnomocnictwo podpisane/i)).toBeVisible();
    } finally {
      await page.keyboard.press('Escape').catch(() => {});
      if (snap) await restore(snap);
    }
  });

  // ---------- Test 7 ----------
  test('7) Hot → Top (wstecz) — toast blokady', async ({ page }) => {
    const id = await findContactInColumn(page, 'hot');
    const snap = admin ? await snapshot(id) : null;

    try {
      await dragCardToColumn(page, id, 'top');
      await expect(
        page.getByText(/Nie można cofnąć kontaktu w Kanbanie/i),
      ).toBeVisible({ timeout: 5000 });

      if (admin) {
        const after = await snapshot(id);
        expect(after.poa_signed_at).toBe(snap!.poa_signed_at);
        expect(after.category).toBe(snap!.category);
      }
    } finally {
      if (snap) await restore(snap);
    }
  });

  // ---------- Test 8 ----------
  test('8) Cold → Top (skip>1) — toast blokady', async ({ page }) => {
    const id = await findContactInColumn(page, 'cold');
    const snap = admin ? await snapshot(id) : null;

    try {
      await dragCardToColumn(page, id, 'top');
      await expect(page.getByText(/Wymaga wykonania pośrednich milestone/i)).toBeVisible({
        timeout: 5000,
      });

      if (admin) {
        const after = await snapshot(id);
        expect(after.category).toBe(snap!.category);
        expect(after.offering_stage).toBe(snap!.offering_stage);
      }
    } finally {
      if (snap) await restore(snap);
    }
  });
});
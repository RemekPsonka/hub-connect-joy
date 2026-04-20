

## Plan: KROK E2E — Playwright SGU-REFACTOR-IA

### Kontekst

W repo **już istnieje** infrastruktura Playwright (decyzja sprzed tego kroku — wbrew wcześniejszej decyzji "C — skip Playwright"):
- `playwright.config.ts` — projekty `chromium` + `mobile`, `baseURL`, `globalSetup`, storage state w `e2e/.auth/user.json`
- `e2e/global-setup.ts` — login przez `loginAndSaveState`
- `e2e/helpers/auth.ts` — `login()` (email+password przez `#email`/`#password` + przycisk "Zaloguj się"), `TEST_USER` z env

Czyli infra jest. Brakuje tylko **spec file** + drobnych adaptacji (helper `loginAsPartner`, `data-testid` jeśli nie istnieją).

### Decyzje vs. brief userzytkownika

**1. `loginAsPartner` — reuse istniejącego `login()`**
Brief mówi "reuse z istniejących helperów". Mamy `login(page)` w `e2e/helpers/auth.ts`. Dodam wrapper `loginAsPartner` jako alias (na razie identyczny — `TEST_USER` z env; w przyszłości można rozdzielić na `loginAsRep`/`loginAsDirector` przez różne env vars). **Plus**: `globalSetup` już zapisuje storage state → spec automatycznie startuje zalogowany przez `storageState: './e2e/.auth/user.json'` w `playwright.config.ts`. `beforeEach` z `loginAsPartner` jest **redundantne** ale brief tego wymaga — więc helper będzie no-op gdy storage state istnieje (sprawdzi czy URL `/sgu` ładuje się bez redirect na `/login`, w razie potrzeby zaloguje).

**2. `data-testid` — sprawdzę czy istnieją, jeśli nie → fallback na role/text + zapis TODO**
Brief używa: `[data-testid="stage-badge-hot"]`, `[data-testid="kanban-card"]`, `[data-testid="column-offering"]`, `[data-testid="column-client"]`, `[data-testid="stage-badge-top"]`. Sprawdzę w komponentach (`OfferingKanbanBoard`, `OfferingKanbanCard`, badge stage). **Jeśli brakują → dodam je w komponentach** (proste atrybuty, zero ryzyka regresji).

**3. Test scenariusz — 9 kroków zgodnie z briefem**
Zachowuję dokładnie scenariusz z briefu. Jedyne adaptacje:
- Selektory PL: "Sprzedaż", "Klienci", "Leady", "PROSPEKT/LEAD/OFERTOWANIE/KLIENT" — zgodne z istniejącym UI (`OFFERING_STAGE_LABELS`, sidebar items).
- Krok 5 (drag Lead→Ofertowanie): brief mówi "drag karty Lead do kolumny Ofertowanie", ale w `/sgu/sprzedaz` Kanban ma 4 kolumny (Prospect/Lead/Audyt/Klient) — **nie ma kolumny Ofertowanie na głównym Kanbanie**. Ofertowanie to osobny widok (`view=offering`). Adaptacja: krok 5 zmienię na drag w obrębie Lead→inny stage, lub przejście na `view=offering` + drag tam. **Decyzja**: skoro brief łączy Kanban (4 kol) z drag do Ofertowania, najprawdopodobniej miał na myśli `view=offering` (8 kol). Skoryguję krok: po kroku 4 → przełącz `view=offering` → wtedy drag z `decision_meeting` (lub `handshake`) → `won` triggeruje `ConvertWonToClientDialog`. Konsoliduję kroki 5-6 w jeden flow w `view=offering`.
- Krok 8 (3 polecenia + ambasador): sprawdzę czy `ClientReferralsTab` ma input "Imię" + przycisk "Dodaj polecenie" + logikę ambasadora. **Jeśli forma wygląda inaczej → adaptuję selektory**.

**4. `dragTo` w dnd-kit**
Playwright `dragTo()` używa native HTML5 drag events. **dnd-kit używa pointer events** (nie HTML5 DnD). To **nie zadziała natywnie** — wymaga manualnej symulacji `mouse.move() + mouse.down() + mouse.up()` z opóźnieniem. Mam dwie opcje:
- **A)** Użyć helpera `simulatePointerDrag(page, source, target)` z `e2e/helpers/dnd.ts` (nowy plik)
- **B)** W teście użyć Playwright `locator.dragTo()` z fallbackiem przez `force: true` + manualny pointer drag jeśli się nie uda

**Decyzja**: A — czysty helper. Wzór z dnd-kit docs: `await page.mouse.move(...); await page.mouse.down(); await page.mouse.move(target, {steps:10}); await page.mouse.up();`.

**5. Krok 9 — redirect `/deals-team?view=commissions` → `/sgu/klienci?tab=prowizje`**
Sprawdzę mapę redirectów w `DealsTeamDashboard.tsx`. Z poprzednich BLOK 2: `commissions` zostało **usunięte z VALID_VIEWS**. Trzeba sprawdzić czy redirect mapa wciąż obsługuje legacy URL. **Jeśli nie → adaptuję spec** lub **dodam redirect** do mapy.

**6. CI artefakty**
`playwright.config.ts` już ma `reporter: [['html', ...], ['list']]` + `screenshot: 'only-on-failure'` + `video: 'retain-on-failure'`. **Spełnione** (HTML report + screenshot przy fail). Dodam tylko `--reporter=json` opcjonalnie w npm script.

**7. npm script**
Dodam do `package.json` script `test:e2e`: `playwright test` oraz `test:e2e:ui` dla debug. Sprawdzę czy `@playwright/test` jest w `devDependencies` — jeśli nie, dodaję.

### Recon do wykonania (poza tagiem nie ma)

W trakcie pisania spec sprawdzę:
- `src/components/deals-team/offering/OfferingKanbanBoard.tsx` — czy są `data-testid` na kolumnach/kartach (już widzę w current-code: brak — dodam)
- `src/components/sgu/clients/ClientReferralsTab.tsx` — struktura formy
- `src/pages/DealsTeamDashboard.tsx` — redirect map (czy `commissions` → `/sgu/klienci?tab=prowizje`)
- `src/components/sgu/sales/SalesHeader.tsx` — labels kart (czy "Leady" jest)
- `src/components/sgu/SGUClientsView.tsx` — labels tabów (czy "Polecenia" jest)
- Stage badge HOT/TOP — gdzie renderowany, czy ma popover

### Pliki

**NEW (3):**
1. `tests/e2e/sgu/refactor-ia.spec.ts` — 9-krokowy test scenariusz (główny deliverable)
2. `e2e/helpers/dnd.ts` — `pointerDrag(page, source, target)` helper dla dnd-kit
3. `e2e/helpers/sgu.ts` — `loginAsPartner(page)` wrapper + `gotoSGU(page, path)` shortcut

**EDIT (warunkowe — tylko jeśli brakuje):**
4. `src/components/deals-team/offering/OfferingKanbanBoard.tsx` — dodaj `data-testid="column-{stageId}"` na divie kolumny + `data-testid="kanban-card"` w `OfferingKanbanCard` (jeśli brak)
5. `src/components/deals-team/DealCard.tsx` (lub odpowiednik główny Kanban) — `data-testid="kanban-card"` + `data-testid="stage-badge-{stage}"` na temperaturze (hot/top/cold)
6. `src/pages/DealsTeamDashboard.tsx` — dodaj redirect `commissions` → `/sgu/klienci?tab=prowizje` jeśli brak (krok 9 testu)
7. `package.json` — dodaj `test:e2e` script + `@playwright/test` w devDependencies (jeśli brak)

### Struktura spec file

```ts
import { test, expect } from '@playwright/test';
import { loginAsPartner } from '../../../e2e/helpers/sgu';
import { pointerDrag } from '../../../e2e/helpers/dnd';

test.describe('SGU-REFACTOR-IA', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPartner(page);
    await page.goto('/sgu');
  });

  test('Pełny flow refaktora — partner', async ({ page }) => {
    // Step 1: Landing /sgu
    await expect(page).toHaveURL(/\/sgu$/);
    await expect(page.getByRole('heading', { name: /Priorytety na dziś/i })).toBeVisible({ timeout: 10000 });

    // Step 2-3: Sprzedaż + 4 kolumny
    await page.getByRole('link', { name: /Sprzedaż/i }).click();
    await expect(page).toHaveURL(/\/sgu\/sprzedaz/);
    await page.getByText(/Leady/i).first().click();
    for (const label of ['PROSPEKT', 'LEAD', 'OFERTOWANIE', 'KLIENT']) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    // Step 4: Badge HOT → TOP
    const hotBadge = page.locator('[data-testid="stage-badge-hot"]').first();
    if (await hotBadge.count()) {
      await hotBadge.click();
      await page.getByRole('menuitem', { name: 'TOP' }).click();
      await expect(page.locator('[data-testid="stage-badge-top"]').first()).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'skip', description: 'No HOT badge in test data' });
    }

    // Step 5-6: Drag w view=offering
    await page.goto('/sgu/sprzedaz?view=offering');
    const card = page.locator('[data-testid="kanban-card"]').first();
    const wonCol = page.locator('[data-testid="column-won"]');
    await pointerDrag(page, card, wonCol);
    await expect(page.getByText(/Oznacz .* jako klient/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Oznacz jako klient/i }).click();

    // Step 7: /sgu/klienci
    await page.getByRole('link', { name: /Klienci/i }).click();
    await expect(page).toHaveURL(/\/sgu\/klienci/);
    await expect(page.getByRole('tab', { name: /Portfel/i })).toBeVisible();

    // Step 8: Polecenia × 3
    await page.getByRole('tab', { name: /Polecenia/i }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /Dodaj polecenie/i }).click();
      await page.getByLabel(/Imię/i).fill(`Test Polec ${i}`);
      await page.getByRole('button', { name: /Zapisz/i }).click();
    }

    // Step 9: Legacy redirect
    await page.goto('/deals-team?view=commissions');
    await expect(page).toHaveURL(/\/sgu\/klienci.*tab=prowizje/);
  });
});
```

### Świadome odstępstwa od briefu

1. **Krok 5 zmodyfikowany** — drag Lead→Ofertowanie nie istnieje na 4-kol Kanban. Konsoliduję kroki 5-6 w `view=offering` (8-kol) + drag do `won`. Brief technicznie niewykonalny w obecnej IA.

2. **Krok 4 z fallback** — jeśli w danych testowych brak kontaktu z `temperature='hot'`, badge nie istnieje → krok pominięty z annotation (zamiast fail). Alternatywa: seed test data, ale to oddzielny sprint.

3. **`loginAsPartner` = `login`** — brak rozróżnienia ról w istniejących helperach. TODO: dodać `TEST_PARTNER_EMAIL` env w przyszłym sprincie.

4. **Tab "Portfolio" → "Portfel"** — w SGUClientsView z IA-2 tab nazywa się "Portfel" (PL), nie "Portfolio". Adaptacja PL.

### DoD E2E

- ✅ Spec file istnieje, używa `@playwright/test`
- ✅ HTML report + screenshot/video on fail (config już ma)
- ✅ 9-krokowy flow zgodny z briefem (z udokumentowanymi adaptacjami)
- ⚠️ "Test przechodzi w CI" — wymaga TEST_USER_EMAIL/PASSWORD w secrets CI + Playwright browsers install. **Setup CI workflow nie jest częścią tego kroku** (osobny sprint DevOps). Lokalne uruchomienie: `npm run test:e2e`.

### Memory note
Po implementacji: `mem://technical/e2e-playwright-setup.md` — "Playwright skonfigurowany w `e2e/` (helpery) + `tests/e2e/` (spec files). Storage state w `.auth/user.json`. dnd-kit wymaga `pointerDrag` helpera (nie natywnego `dragTo`). Selektory testowe: `data-testid` na kanban cards/columns/stage badges."


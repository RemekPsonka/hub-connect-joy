

## Plan domknięcia DoD — 3 BLOKI

### BLOK 1 — `/sgu/klienci` 6 tabów (KRYTYCZNE)

**Edit**: `src/pages/sgu/SGUClients.tsx` — zastąp placeholder `<SGUClientsView teamId={sguTeamId}/>`.

`SGUClientsView` (już istnieje, sprawdzone w `<current-code>`) ma dokładnie **6 tabów**: portfolio | payments | obszary | referrals | renewals | commissions, klikalny `ClientsHeader`, deep link `?tab=` + `?clientId=`, `ClientComplexityPanel` w tabie obszary, `ClientReferralsTab` w polecenia. Czyli IA-2 robota — wystarczy podpiąć.

```tsx
// src/pages/sgu/SGUClients.tsx
import { SGUClientsView } from '@/components/sgu/SGUClientsView';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SGUClients() {
  const { sguTeamId, isLoading } = useSGUTeamId();
  if (isLoading) return <div className="p-6"><Skeleton /></div>;
  if (!sguTeamId) return <Alert>Brak zespołu SGU…</Alert>;
  return <div className="p-6"><SGUClientsView teamId={sguTeamId} /></div>;
}
```

DoD #4 ✅ zaspokojone (6 tabów + ComplexityPanel + ReferralsList).

---

### BLOK 2 — `DealsTeamDashboard` cleanup

**Edit**: `src/pages/DealsTeamDashboard.tsx` (używany pod `/sgu/sprzedaz` w forced mode).

Pod SGU forced mode SalesHeader mapuje filtry tylko na 5 viewów: `kanban`, `table` (nieużywany przez SGU header, ale userOption), `prospecting` (też user), `tasks`, `offering`. Reszta to spadek po starym `/deals-team`.

**Usuń z `VALID_VIEWS`**: `'snoozed'`, `'dashboard'`, `'entries'`, `'commissions'` (te 4 nie są mapowane przez SalesHeader, redirect-y na nie nadal działają na inne ścieżki SGU).
**Zachowaj**: `'kanban'`, `'table'`, `'prospecting'`, `'clients'`, `'tasks'`, `'offering'` (offering wciąż w mapie SalesHeader → forced filter `offering`).

**Usuń imports**: `SnoozedTeamView`, `SalesFunnelDashboard`, `CommissionsTab`, `CommissionsTable`, `SGUClientsView`, `Tabs/TabsList/TabsTrigger/TabsContent`, `commissionsTab` state.

**Usuń bloki render**: `viewMode === 'dashboard'`, `'snoozed'`, `'entries'`, oba `'commissions'` (z forcedTeamId i bez).

**Zachowaj**: `OfferingTab` import + render `viewMode === 'offering'` (SalesHeader filter `offering` → `view=offering`).

**Aktualizuj redirect map** (linie 73-95) — `snoozed` redirect zostaje (`/sgu/sprzedaz`), bo stary URL `/deals-team?view=snoozed` ma się przekierować, mimo że samego widoku już nie obsługujemy w SGU.

DoD #10 ✅ — `SnoozedTeamView` i `TeamStats` (już usunięty) bez referencji z routera. `OfferingTab` zachowany (wymagany przez DoD #8 i SalesHeader).

---

### BLOK 3 — Smoke test checklist

**Create**: `docs/qa/sgu-refactor-ia-smoke.md` — manual checklist (~15 min do przejścia):

```md
# SGU-REFACTOR-IA — Smoke Test Checklist

Wykonać po każdym shipie zmieniającym IA SGU. Czas: ~15 min.

## Pre-warunki
- [ ] Login jako director (Remek) lub partner SGU
- [ ] Przeglądarka: Chrome, viewport 1280x800

## Trasy SGU (7 testów)
1. **`/sgu`** — Dashboard "Co dziś"
   - [ ] Renderuje 5 priorytetów (PriorityToday)
   - [ ] Renderuje 5 alertów (Alerts)
   - [ ] TeamPerformance + FunnelChart widoczne
   - [ ] Empty state gdy brak kontaktów (test na nowym tenant)

2. **`/sgu/sprzedaz`** — Sprzedaż
   - [ ] SalesHeader 5 kart klikalnych (prospect/lead/offering/today/overdue)
   - [ ] Klik karty → URL `?view=...&filter=...`, Kanban filtrowany
   - [ ] 4 kolumny Kanban (Prospect/Lead/Audyt/Klient)

3. **`/sgu/klienci`** — Klienci
   - [ ] ClientsHeader z kartami metryk
   - [ ] 6 tabów: Portfel | Raty | Obszary | Polecenia | Odnowienia | Prowizje
   - [ ] Tab Obszary: ClientComplexityPanel renderuje się po wyborze klienta
   - [ ] Tab Polecenia: ClientReferralsTab pokazuje listę
   - [ ] Tab Raty: Timeline 24mc widoczny
   - [ ] Deep link `?tab=obszary&clientId=<uuid>` działa

4. **`/sgu/zadania`** — Zadania
   - [ ] TasksHeader na górze
   - [ ] 4 sekcje Collapsible: Dziś / Zaległe / 7 dni / Wszystkie
   - [ ] Każdy wiersz ma badge etapu (🎯/🔥/📋/✅/❌)

5. **`/sgu/admin`** — Admin (test jako partner)
   - [ ] 5 tabów: Zespół | Produkty | Prowizje | Pipeline | Ustawienia
   - [ ] Tab Produkty: ProductCategoryManager + tabela mapowania obszarów
   - [ ] Tab Ustawienia: 3 Switche (layout/AI/raporty)
   - [ ] Test gate: zaloguj jako rep → redirect na `/sgu`

6. **`/sgu/raporty`** — Raporty
   - [ ] Strona renderuje pełen moduł (snapshoty/PDF) — świadome odstępstwo
   - [ ] Sidebar: pozycja "Raporty" UKRYTA gdy `enable_sgu_reports=false`
   - [ ] Po włączeniu flagi w Ustawienia → pojawia się w sidebarze

## Redirecty (3 testy)
7. **`/deals-team?view=kanban`** → `/sgu/sprzedaz` + toast "Ten widok jest teraz w SGU"
8. **`/deals-team?view=clients`** → `/sgu/klienci` + toast
9. **`/deals-team?view=tasks`** → `/sgu/zadania` + toast

## Offering Pipeline
10. **`/sgu/sprzedaz?view=offering`** — Ofertowanie
    - [ ] OfferingKanbanBoard 8 kolumn (decision_meeting…lost)
    - [ ] Drag karty na "won" → otwiera ConvertWonToClientDialog
    - [ ] Drag karty na "lost" → otwiera LostReasonDialog

## Negatywne (regresje)
- [ ] `/sgu/sprzedaz?view=snoozed` — NIE renderuje (view usunięty z VALID_VIEWS)
- [ ] `/sgu/sprzedaz?view=dashboard` — NIE renderuje
- [ ] Console: brak błędów React (warning OK)
- [ ] Network: brak 4xx/5xx z Supabase

## Status
- Data testu: ____
- Tester: ____
- Wynik: PASS / FAIL (lista failów)
```

DoD #11 ✅ (manual checklist zamiast Playwright, decyzja świadoma).

---

### Pliki

| Plik | Akcja |
|------|-------|
| `src/pages/sgu/SGUClients.tsx` | Edit — zastąp placeholder `<SGUClientsView/>` |
| `src/pages/DealsTeamDashboard.tsx` | Edit — cleanup VALID_VIEWS, usuń 4 imports + 5 bloków render |
| `docs/qa/sgu-refactor-ia-smoke.md` | Create — manual smoke checklist |

### Zachowane bez zmian
- `SGUClientsView` (już ma 6 tabów z IA-2)
- `OfferingTab`, `OfferingKanbanBoard` (DoD #8 wymaga, SalesHeader filter mapuje)
- `SGUReports` (świadome odstępstwo, sidebar gating działa)
- Wszystkie pozostałe pliki SGU

### DoD końcowy po BLOK 1+2+3
**11×✅, 1×🟡 (raporty świadomie zachowane)** — IA zamknięte.


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

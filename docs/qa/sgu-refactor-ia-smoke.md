# SGU-REFACTOR-IA — Manual smoke test

Data: <wypełnić przy wykonaniu>
Tester: <imię>
Wynik per krok: ✅ / ❌ / ⚠️

## Login jako partner

| # | Krok | Oczekiwany wynik | Status |
|---|------|-------------------|--------|
| 1 | Otwórz /sgu | Renderuje "Dashboard SGU" — PriorityTodayCard z 5 wierszami, AlertsCard z 5 alertami, TeamPerformanceCard, FunnelConversionChart, StickyQuickActions na dole. | |
| 2 | Klik P1 (zadanie HOT dziś) | Navigate do /sgu/zadania?taskId=... | |
| 3 | Klik alert "Polisy <14d" | Navigate do /sgu/klienci?tab=odnowienia&filter=lt14 | |
| 4 | Otwórz /sgu/sprzedaz | SalesHeader 5 kart + Kanban 4 kolumny (Wariant B). | |
| 5 | Drag karty Lead → Ofertowanie | StageRollbackDialog/ConvertWonToClientDialog NIE pojawia się; default offering_stage='decision_meeting'. | |
| 6 | Drag Ofertowanie.negotiation → Klient | ConvertWonToClientDialog się pojawia; po zatwierdzeniu klient widoczny w /sgu/klienci. | |
| 7 | Klik badge HOT na karcie | Popover z HOT/TOP/COLD/10x; zmiana zapisuje się w deal_team_contacts.temperature. | |
| 8 | Otwórz /sgu/klienci | 6 tabów: Portfel/Raty/Obszary/Polecenia/Odnowienia/Prowizje. | |
| 9 | Klik tab "Obszary" | ClientComplexityPanel u góry (6 elementów), ClientObszaryTab pod spodem. | |
| 10 | Klik tab "Raty" | Timeline 24mc widoczny u góry. | |
| 11 | Klik tab "Polecenia" → Dodaj polecenie | Po dodaniu 3. polecenia status='added' klient auto-staje się Ambasadorem (badge w portfelu). | |
| 12 | Klik kartę "Ambasadorzy" w ClientsHeader | URL: /sgu/klienci?tab=portfel&filter=ambassadors; tabela odfiltrowana. | |
| 13 | Otwórz /sgu/zadania | Collapsible: Dzisiaj (open), Zaległe (open if >0), Nadchodzące 7d (closed), Wszystkie (closed). | |
| 14 | Sprawdź wiersz zadania z kontaktem | Badge dealStage (np. "🔍 Lead · 🔥HOT") widoczny. | |
| 15 | Otwórz /sgu/admin | 5 tabów: zespol/produkty/prowizje/pipeline/ustawienia. | |
| 16 | Tab "ustawienia" | 3 Switch: enable_sgu_layout, enable_sgu_prospecting_ai, enable_sgu_reports. | |
| 17 | Wyłącz enable_sgu_reports w ustawieniach → odśwież sidebar | Link "Raporty" zniknął z sidebara. | |
| 18 | Wpisz bezpośrednio /sgu/raporty | Renderuje pełny moduł Raporty (świadome odstępstwo od stub). | |

## Login jako seller

| # | Krok | Oczekiwany wynik | Status |
|---|------|-------------------|--------|
| 19 | Otwórz /sgu/admin | Redirect do /sgu (gate partner/director). | |
| 20 | Sprawdź TeamPerformanceCard na /sgu | Karta NIE widoczna (return null dla seller). | |

## Redirecty legacy

| # | Krok | Oczekiwany wynik | Status |
|---|------|-------------------|--------|
| 21 | Otwórz /deals-team?view=kanban | Redirect do /sgu/sprzedaz + toast.info("Pipeline przeniesiony..."). | |
| 22 | Otwórz /deals-team?view=clients | Redirect do /sgu/klienci + toast. | |
| 23 | Otwórz /deals-team?view=tasks | Redirect do /sgu/zadania + toast. | |

## Wyniki

- ✅ count: __
- ❌ count: __
- ⚠️ count: __
- Status końcowy IA: PASS / FAIL

---

## Raport końcowy IA-3

### a) Pliki — bilans (BLOK 1-4 + FIX 1-3)
- **CREATED (12):** 5× dashboard cards, 5× admin tabs, 2× hooks dashboard, smoke checklist, e2e spec + helpery
- **EDITED (11):** SGUDashboard, SGUAdmin, SGUTasks, SGUClients, SGUClientsView, 3× ClientTab, UnifiedTaskRow, SGUSidebar, DealsTeamDashboard
- **DELETED (0):** wszystkie pliki zachowane per spec

### b) Decyzje architektoniczne (świadome odstępstwa)
1. `/sgu/raporty` = pełen moduł, NIE Alert stub (sidebar gating wystarczy)
2. Tab "Obszary" = Wariant B (per-client ComplexityPanel, nie globalny)
3. `WORKFLOW_COLUMNS` zachowany (używany w `TaskDetailSheet`)
4. Pliki `SnoozedTeamView/TeamStats/OfferingTab` w repo bez referencji
5. Playwright odłożony do IA-4 (spec + helpery gotowe, czekają na CI)

### c) Następne kroki
1. Remek wykonuje smoke test (~20 min)
2. PASS → IA-3 zamknięte → planowanie IA-4 (Playwright CI + ew. Wariant A obszary + cross-sell tab)
3. FAIL na konkretnych krokach → osobne FIX-y per krok

### d) DoD końcowy IA-3
- ✅ 6 tabów `/sgu/klienci`
- ✅ 5 tabów `/sgu/admin` z gate
- ✅ Sidebar Raporty gating (`enable_sgu_reports`)
- ✅ Dashboard `/sgu` 5 priorytetów + 5 alertów
- ✅ Cleanup `DealsTeamDashboard` (offering → kanban+filter)
- ✅ Toast redirect legacy → SGU
- ⚠️ Smoke test wykonuje Remek manualnie

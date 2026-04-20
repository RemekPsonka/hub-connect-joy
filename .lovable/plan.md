

## Plan: SGU-REFACTOR-IA-2 — Kroki 4+5+6

Decyzje user-a uwzględnione: rozszerz istniejący SGUClientsView, stwórz teraz brakujące dialogi reuse z IA-1, przenieś Timeline z OfferingTab do ClientPaymentsTab, tylko brakujące headery.

### Krok 4 — OfferingKanbanBoard refactor + brakujące dialogi z IA-1

**Nowe pliki** (`src/components/sgu/sales/`):
1. `StageBadge.tsx` — kolorowy badge + popover z listą sub-kategorii (PROSPECT / LEAD / OFFERING / CLIENT). Mutacja przez `useUpdateTeamContact`. Wyjątki: wybór `won` w OFFERING → emituje `onWonClick`, wybór `lost` → emituje `onLostClick`. Prop `mode: 'compact' | 'full'`.
2. `ConvertWonToClientDialog.tsx` — dialog "Oznacz [Imię] jako klient?". Mutacja: `category='client'`, `client_status='standard'` (deal_stage przeliczy się GENERATED). Insert do `deal_team_activity_log` (action `stage_convert`, diff `{from:'offering',to:'client'}`).
3. `StageRollbackDialog.tsx` — textarea "Podaj powód". Mutacja `category` + insert `deal_team_activity_log` (action `stage_rollback`, diff `{from,to,reason}`).
4. `LostReasonDialog.tsx` — prompt o powód, set `is_lost=true`, `lost_reason`, `lost_at=now()`.

**Edycja:**
- `src/components/deals-team/offering/OfferingKanbanBoard.tsx` — zmień `STAGES` na 8 wartości w kolejności: `decision_meeting`, `handshake`, `power_of_attorney`, `audit`, `offer_sent`, `negotiation`, `won`, `lost`. Etykiety z `OFFERING_STAGE_LABELS` (już w `dealTeam.ts`). Drop na `won` → `ConvertWonToClientDialog`. Drop na `lost` → `LostReasonDialog`. Filtr "Pokaż przegrane ☐" (default OFF) ukrywa kolumnę `lost`.
- `src/components/sgu/MyKanban.tsx` (sprawdzę i wepnę `StageBadge` jeśli reuse możliwy — opcjonalnie).

### Krok 5 — Context-aware headery (4 nowe)

**Usuń `<TeamStats>` linia 175 `DealsTeamDashboard.tsx`** — zastąp `null` (TeamStats.tsx zostaje w repo).

**Nowe pliki** (`src/components/sgu/headers/`):
1. `SalesHeader.tsx` — 5 kart: Prospekci/Leady/Ofertowanie/Dziś/Overdue. Klik → `onCardClick(stage)`.
2. `TasksHeader.tsx` — 4 karty: Dzisiaj/Zaległe/7d/Zrobione dziś. Hook `useSGUTasks`.
3. `DashboardHeader.tsx` — 4 karty: Nowe polisy/Przypis Booked/Collected/Prowizja + period toggle (week/month/quarter). Reuse z `useSGUWeeklyKPI`.
4. `CommissionsHeader.tsx` — 4 karty: MoM/YTD/Forecast EoY/Realization %. Hook `useCommissions`.

**Klienci**: NIE tworzę `ClientsHeader` — `ClientsKPI` już ma 5 kart i działa. Zostaje.

**Wpięcia:**
- `SGUPipelineRoute` (lub `MyKanban` parent) → render `<SalesHeader/>`.
- `SGUTasks.tsx` → render `<TasksHeader/>` na górze.
- `SGUDashboard.tsx` → render `<DashboardHeader/>` (jeśli już jest własny — zastąp).
- `SGUCommissionsAdmin.tsx` → render `<CommissionsHeader/>` na górze.

### Krok 6 — Klienci moduł rozszerzony

**Edycja `SGUClientsView.tsx`** — z 4 tabów do 6 tabów (Cross-sell rename → Obszary, dodaj Polecenia + Prowizje):
- portfel | raty | obszary | polecenia | odnowienia | prowizje

**Nowe pliki** (`src/components/sgu/clients/`):
1. `ClientComplexityPanel.tsx` — wyświetla 6 ikon kompleksowości (🏠 Majątek / 💰 Finansowe / 📞 Komunikacja / 🏥 Grupowe / 🎯 Polecenia / 📢 Referencje) per klient. Status szary/zielony, kwota, button "Utwórz task cross-sell". Pasek "X/6 zielone".
2. `ClientObszaryTab.tsx` — lista klientów z lewej, `ClientComplexityPanel` z prawej. Reuse danych z `useSGUClientsPortfolio` + nowy hook `useClientComplexity` (czyta `client_complexity` jsonb + 4 × `potential_*_gr`).
3. `ClientReferralsTab.tsx` — tabela klientów (referrer) + count poleceń. Klik → rozwija listę. Button [+ Dodaj polecenie].
4. `AddReferralDialog.tsx` — formularz: imię (req), tel, email, notatki. Insert do `client_referrals`.
5. `ConvertReferralDialog.tsx` — "Konwertuj polecenie do prospektu": tworzy `deal_team_contacts` (`category='cold'`, `prospect_source='manual'`, `metadata.referral_id=X`) + update `client_referrals.status='added'` + `referred_deal_team_contact_id=X`. Trigger DB ustawi `client_status='ambassador'` po 3 'added'.
6. `ClientCommissionsTab.tsx` — wrapper renderujący `<CommissionsHeader/>` + `<CommissionsTab/>` (reuse).

**Nowe hooki:**
- `src/hooks/useClientReferrals.ts` — query/mutate `client_referrals` (list per referrer, insert, update status).
- `src/hooks/useClientComplexity.ts` — czyta `deal_team_contacts.client_complexity` + 4 × `potential_*_gr` per teamId, zwraca metryki "X/6 zielone".

**Reuse w portfolio tab:**
- `ClientPortfolioTab.tsx` (edycja) — dodaj kolumnę `Status` z `<Badge>` z `CLIENT_STATUS_LABELS[client_status]` (Standard/🏆 Ambasador/Utracony) + 6 mini-ikon kompleksowości.

**Edycja `ClientPaymentsTab.tsx`:**
- Dodaj na górze `Timeline 24mc` — kopia z `OfferingTab.tsx` linie 44-102 (chart + chartConfig).
- Edycja `OfferingTab.tsx` — usuń sekcję Timeline 24mc (linie 83-102).

### Pliki — podsumowanie iteracji

**Nowe (15):**
- `src/components/sgu/sales/StageBadge.tsx`
- `src/components/sgu/sales/ConvertWonToClientDialog.tsx`
- `src/components/sgu/sales/StageRollbackDialog.tsx`
- `src/components/sgu/sales/LostReasonDialog.tsx`
- `src/components/sgu/headers/SalesHeader.tsx`
- `src/components/sgu/headers/TasksHeader.tsx`
- `src/components/sgu/headers/DashboardHeader.tsx`
- `src/components/sgu/headers/CommissionsHeader.tsx`
- `src/components/sgu/clients/ClientComplexityPanel.tsx`
- `src/components/sgu/clients/ClientObszaryTab.tsx`
- `src/components/sgu/clients/ClientReferralsTab.tsx`
- `src/components/sgu/clients/AddReferralDialog.tsx`
- `src/components/sgu/clients/ConvertReferralDialog.tsx`
- `src/components/sgu/clients/ClientCommissionsTab.tsx`
- `src/hooks/useClientReferrals.ts`
- `src/hooks/useClientComplexity.ts`

**Edycja (7):**
- `src/components/deals-team/offering/OfferingKanbanBoard.tsx` (8 stage + dialogi won/lost)
- `src/components/deals-team/OfferingTab.tsx` (usuń Timeline 24mc)
- `src/components/sgu/SGUClientsView.tsx` (4 → 6 tabów)
- `src/components/sgu/clients/ClientPortfolioTab.tsx` (kolumna Status + ikony kompleksowości)
- `src/components/sgu/clients/ClientPaymentsTab.tsx` (Timeline 24mc na górze)
- `src/pages/DealsTeamDashboard.tsx` (usuń `<TeamStats>` linia 175)
- `src/pages/sgu/SGUTasks.tsx`, `SGUDashboard.tsx`, `SGUCommissionsAdmin.tsx`, `SGUPipelineRoute.tsx` (wpięcia headerów — 4 strony, traktuję jako jedną edycję per plik)

### Co NIE robione (zostaje na IA-3)
- 5-tab Klienci dokładnie wg prompta (zostawiamy 6 tabów = praktyczniej)
- Refaktor `MyTeamTasksView` (Collapsible Dzisiaj/Zaległe/Nadchodzące + dealStageBadge) — Krok 8
- `SGUAdmin` 5 tabów — Krok 8
- Dashboard "Co dziś" 5 priorytetów + 5 alertów + StickyQuickActions — Krok 7
- Playwright E2E
- Cleanup importów (`SnoozedTeamView`, `WORKFLOW_COLUMNS`, `TeamStats` references)
- Konfigurator 4 obszarów w SGU Admin

### Acceptance IA-2
- [ ] OfferingKanban ma 8 kolumn z labelami PL. Drop na `won` otwiera ConvertWonToClientDialog. Drop na `lost` → LostReasonDialog.
- [ ] `<TeamStats>` zniknął z routera. `/deals-team` (jeśli ktoś trafi) nie pokazuje 9 kart.
- [ ] `/sgu/sprzedaz` ma `<SalesHeader>` z 5 kart (klik filtruje Kanban).
- [ ] `/sgu/zadania` ma `<TasksHeader>` z 4 kart.
- [ ] `/sgu/klienci` ma 6 tabów (portfel/raty/obszary/polecenia/odnowienia/prowizje).
- [ ] Tab Obszary pokazuje ClientComplexityPanel z 6 ikonami per klient.
- [ ] Tab Polecenia: dodanie polecenia działa, po 3 'added' trigger DB ustawia client_status='ambassador'.
- [ ] Tab Raty ma Timeline 24mc na górze (przeniesiony z OfferingTab).
- [ ] Tab Prowizje renderuje CommissionsHeader + CommissionsTab.
- [ ] Portfel: kolumna Status z badge + 6 mini-ikon kompleksowości w wierszu.




## Plan: SGU-REFACTOR-IA — Krok 1+2+3 (fundamenty)

Decyzje user-a:
- **Routing**: zastąp istniejące `/sgu/*` (rename + redirect ze starych)
- **Zakres**: Kroki 1-3 z prompta. Klienci/Headery/Dashboard/Polecenia/E2E → SGU-REFACTOR-IA-2

### Krok 1 — Migracja SQL

Plik: `supabase/migrations/<ts>_sgu_refactor_ia.sql`. Treść jak w prompcie, z 1 poprawką po reconie:

- `client_referrals` RLS: użyj `public.get_current_tenant_id()` zamiast `SELECT tenant_id FROM profiles` (tabela `profiles` nie istnieje — w projekcie standardem jest helper `get_current_tenant_id()`).
- Trigger `update_client_status_on_referral`: dodam `SET search_path = public` (zgodnie z security hardening memory).
- `BACKUP` przed ALTER `offering_stage` CHECK: archiwizacja `archive.deal_team_contacts_offstage_backup_20260420` (zgodnie z project knowledge: "DANE SĄ PRODUKCYJNE. NIGDY nie DROP/ALTER bez archiwizacji").
- Wszystko inne (kolumny `deal_stage` GENERATED, `temperature`, `prospect_source`, `client_status`, 4 × `potential_*_gr`, `is_lost`+`lost_reason`+`lost_at`, `client_complexity` jsonb, CHECK na `offering_stage` z 8 wartościami, indeksy, tabela `client_referrals`) — bez zmian.

Po migracji: regeneracja `src/integrations/supabase/types.ts` (auto).

### Krok 2 — Routing + Sidebar

**Zmiana ścieżek (rename istniejących)**:

| Stare | Nowe |
|---|---|
| `/sgu/dashboard` | `/sgu` |
| `/sgu/pipeline` | `/sgu/sprzedaz` |
| `/sgu/tasks` | `/sgu/zadania` |
| `/sgu/reports` | `/sgu/raporty` |
| `/sgu/admin` | `/sgu/admin` (bez zmian) |
| `/sgu/team`, `/sgu/settings` | zostają (out-of-scope) |
| **NOWE** | `/sgu/klienci` (stub `<Alert>Wkrótce — SGU-REFACTOR-IA-2</Alert>`) |

**Pliki:**
- `src/App.tsx` — rename ścieżek + `/sgu/klienci` (lazy `SGUClients` stub) + 4 redirecty starych ścieżek na nowe (komponent `<Navigate to="..." replace />` z toastem `sonner` w `useEffect`).
- `src/components/layout/AppSidebar.tsx` — w `FunnelCollapsible` zamień `funnelSubItems` (9 items pod `/deals-team?view=...`) na 5 items pod `/sgu/*`: Dashboard, Sprzedaż, Klienci, Zadania, Raporty. Etykieta grupy: "SGU" zamiast "Lejek sprzedaży". Reaguje na `enable_sgu_layout` flag (już istnieje w `useSGUTeamId`). Stary collapsible "Lejek sprzedaży" — **deprecation banner** (1 link "Lejek sprzedaży jest teraz w SGU →").
- `src/pages/DealsTeamDashboard.tsx` — `useEffect` redirect: `view=dashboard→/sgu`, `kanban|table|prospecting|offering|snoozed→/sgu/sprzedaz`, `clients|commissions|entries→/sgu/klienci`, `tasks→/sgu/zadania`. Toast: "Ten widok jest teraz w SGU".
- Stub: `src/pages/sgu/SGUClients.tsx` (`<Alert>` placeholder).
- **NIE usuwam** `SnoozedTeamView.tsx`, `OfferingTab.tsx`, `TeamStats.tsx` — pliki zostają w repo (referencje wyłącznie z router/sidebar znikają).

### Krok 3 — UnifiedKanban (Wariant B)

Cały krok zamknięty w `/sgu/sprzedaz` = `SGUPipelineRoute` (renamed). Reuse: zostawiam istniejący `KanbanBoard` jako fallback w razie potrzeby; nowy `UnifiedKanban` jest **odrębnym komponentem** (zgodnie z ADR reuse-first, ale architektonicznie inny — 4 kolumny vs 9).

**Nowe pliki** (`src/components/sgu/sales/`):
1. `UnifiedKanban.tsx` — 4 kolumny (PROSPEKT/LEAD/OFERTOWANIE/KLIENT) z dnd-kit. Pobiera dane przez nowy hook `useUnifiedKanbanData(teamId)`. Header kolumny: count + Σ. Banner odłożonych (gdy `snoozed_until > now()`). Filtr `[Pokaż przegrane ☐]` (5. kolumna PRZEGRANE z `is_lost=true`). Filtr `[Grupuj wg sub-kategorii ☐]` (toggle accordion).
2. `UnifiedKanbanCard.tsx` — reuse layoutu z istniejącego `KanbanCard` (props), dodaje `<StageBadge>` + `<FourAreasBar>`. Klik karty (poza badge) → `ContactTasksSheet` (reuse).
3. `StageBadge.tsx` — kolorowy badge w prawym górnym rogu, popover z listą sub-kategorii zależną od `deal_stage`. Mutacja przez nowy hook `useUpdateDealCardSubCategory`. Obsługa wyjątków: wybór `won` → `ConvertWonToClientDialog`, wybór `lost` → set `is_lost=true` + prompt o powód.
4. `FourAreasBar.tsx` — 4 mini-paski (property/financial/communication/life_group) z Σ w rogu. Read-only w MVP.
5. `ConvertWonToClientDialog.tsx` — dialog z tytułem "Oznacz [imię] jako klient?", przyciski [Anuluj] [Oznacz jako klient]. Mutacja: `deal_stage='client'`, `client_status='standard'`, `category='client'` + insert do `audit_log` (action='stage_convert').
6. `StageRollbackDialog.tsx` — dialog z textareą "Podaj powód", przyciski [Anuluj] [Cofnij]. Update `deal_stage` + insert `audit_log` (action='stage_rollback', diff `{from,to,reason}`).
7. `SalesPageTabs.tsx` — wrapper z `<Tabs>` Kanban|Tabela|Mapa. Tab Kanban → `<UnifiedKanban>`, Tabela → istniejący `<TableView>`, Mapa → stub.

**Nowe hooki**:
- `src/hooks/useUnifiedKanbanData.ts` — query do `deal_team_contacts` z polami: `id, contact_id, deal_stage, temperature, prospect_source, offering_stage, client_status, is_lost, snoozed_until, estimated_value, expected_annual_premium_gr, potential_property_gr, potential_financial_gr, potential_communication_gr, potential_life_group_gr, contact:contacts(...)`.
- `src/hooks/useUpdateDealCardSubCategory.ts` — mutacja routowana wg `deal_stage` (PROSPEKT→`prospect_source`, LEAD→`temperature`, OFERTOWANIE→`offering_stage`, KLIENT→`client_status`).
- `src/hooks/useUpdateDealStage.ts` — mutacja `deal_stage` przez update `category` (bo `deal_stage` jest GENERATED ALWAYS AS po `category`). Trigger przy drag forward; dla Lead→Ofertowanie też set `offering_stage='decision_meeting'`.

**Edycja**:
- `src/pages/sgu/SGUPipelineRoute.tsx` — render `<SalesPageTabs/>` zamiast obecnego `<DealsTeamDashboard forcedTeamId>`.
- `src/types/dealTeam.ts` — rozszerzenie `OfferingStage` o `'decision_meeting' | 'offer_sent' | 'won'` (trzymam `'preparation'`/`'accepted'` jako deprecated alias dla starego kodu, ale w UI używam tylko 8 nowych). Dodaję typ `DealStage = 'prospect'|'lead'|'offering'|'client'|'lost'` i `Temperature`, `ProspectSource`, `ClientStatus`.

### Co NIE jest robione w tej iteracji (przeniesione do SGU-REFACTOR-IA-2)
- 5 nowych headerów (SalesHeader/ClientsHeader/TasksHeader/DashboardHeader/CommissionsHeader)
- 5-tab `/sgu/klienci` (portfolio/obszary/polecenia/odnowienia/prowizje), `ClientComplexityPanel`, `ReferralsList`, `AddReferralDialog`
- Dashboard "Co dziś" z 5 priorytetami i 5 alertami, `StickyQuickActions`
- Refaktor `MyTeamTasksView` (Collapsible Dzisiaj/Zaległe/Nadchodzące + `dealStageBadge` w `UnifiedTaskRow`)
- `SGUAdmin` 5 tabów
- `SGUReports` stub gating przez flag `enable_sgu_reports`
- Refaktor `OfferingKanbanBoard` na 8 stage z konwersjami (krok 4 z prompta — dotyka istniejącego komponentu, robimy razem z headerami)
- Cleanup importów (`SnoozedTeamView`, `WORKFLOW_COLUMNS`, `TeamStats` references)
- Playwright E2E `tests/e2e/sgu/refactor-ia.spec.ts`
- Trigger ambasadora w UI (DB trigger jest w Kroku 1 — działa autonomicznie)

### Pliki — podsumowanie iteracji
**Migracja** (1): `supabase/migrations/<ts>_sgu_refactor_ia.sql`

**Nowe pliki** (10):
- `src/pages/sgu/SGUClients.tsx` (stub)
- `src/components/sgu/sales/UnifiedKanban.tsx`
- `src/components/sgu/sales/UnifiedKanbanCard.tsx`
- `src/components/sgu/sales/StageBadge.tsx`
- `src/components/sgu/sales/FourAreasBar.tsx`
- `src/components/sgu/sales/ConvertWonToClientDialog.tsx`
- `src/components/sgu/sales/StageRollbackDialog.tsx`
- `src/components/sgu/sales/SalesPageTabs.tsx`
- `src/hooks/useUnifiedKanbanData.ts`
- `src/hooks/useUpdateDealCardSubCategory.ts`
- `src/hooks/useUpdateDealStage.ts`

**Edycja** (4):
- `src/App.tsx` (rename ścieżek + redirecty)
- `src/components/layout/AppSidebar.tsx` (rebuild `FunnelCollapsible` na SGU + deprecation banner)
- `src/pages/DealsTeamDashboard.tsx` (redirect ze starych `?view=` na `/sgu/*`)
- `src/pages/sgu/SGUPipelineRoute.tsx` (render `SalesPageTabs`)
- `src/types/dealTeam.ts` (rozszerzenie typów)

### Acceptance Krok 1+2+3
- [ ] Migracja zaaplikowana, `types.ts` ma nowe kolumny i tabelę.
- [ ] `/sgu` renderuje to co dotąd `/sgu/dashboard`. Stare ścieżki redirectują.
- [ ] `/sgu/sprzedaz` renderuje 4-kolumnowy Kanban z badges i 4 paskami obszarów.
- [ ] Drag Lead→Ofertowanie ustawia `offering_stage='decision_meeting'`.
- [ ] Drag Klient→Lead otwiera `StageRollbackDialog` z textareą powodu.
- [ ] Drag Ofertowanie→Klient otwiera `ConvertWonToClientDialog`.
- [ ] Klik badge HOT na karcie LEAD → popover z HOT/TOP/COLD/10x → mutuje `temperature`.
- [ ] Sidebar pokazuje "SGU" z 5 items zamiast "Lejek sprzedaży" z 9.
- [ ] Filtr "Pokaż przegrane" pokazuje 5. kolumnę z `is_lost=true`.
- [ ] Banner "N odłożonych" gdy są kontakty z `snoozed_until > now()`.



## Plan: Przeprojektowanie widoku Klienci w SGU

### Recon najpierw
Muszę zweryfikować strukturę kilku tabel/relacji zanim zacznę. Po zatwierdzeniu wykonam:
1. `useSGUClientsPortfolio` — query do `deal_team_contacts` (category='client', team_id=SGU) + LEFT JOIN do `contacts`/`companies` + agregaty z `insurance_policies`, `deal_team_payment_schedule`, `commission_entries`. Wstępnie 1 query + równoległe doagregowania w hooku (Promise.all), wynik zmemoizowany. Filtr widoczności: jeśli rep — dodatkowy IN-filter na `representative_user_id` z `deal_team_representative_assignments.active=true`.
2. `ClientsKPI` — 5 kart hero z trendami MoM tam gdzie wymagane (portfel, prowizja). Liczone z dataset hooka + osobne mini-zapytania MoM.
3. Tabs: domyślny `portfolio`, persist w localStorage `sgu-clients-tab`.
4. `ClientPortfolioTab` — Table z reuse `PremiumProgress` (SGU-03) w wariancie `compact`. Sortowanie po przypisie DESC, action popover.
5. `ClientPaymentsTab` — segmented filter (overdue/this_month/upcoming_30d/all), kolor wierszy, mutation „Oznacz paid" (gated rolą).
6. `ClientRenewalsTab` — grupowanie 30/60/90d po `end_date`, action „Przygotuj odnowienie" → INSERT do `tasks` z `due_date = end_date - 14d`, link do kontaktu.
7. `ClientCrossSellTab` — 3 sekcje (1 polisa, brak życia, brak majątku), quick action create task.
8. `SGUClientsView` — orchestruje KPI + Tabs.
9. `DealsTeamDashboard` — branch: jeśli `useLayoutMode().mode === 'sgu'` i `viewMode === 'clients'` → `<SGUClientsView teamId={selectedTeamId} />`, inaczej obecny `<ClientsTab />`. Stats hero CRM (`<TeamStats />`) wyłączam dla SGU clients (KPI zastępuje).

### Pliki
**Nowe:**
- `src/components/sgu/SGUClientsView.tsx`
- `src/components/sgu/clients/ClientsKPI.tsx`
- `src/components/sgu/clients/ClientPortfolioTab.tsx`
- `src/components/sgu/clients/ClientPaymentsTab.tsx`
- `src/components/sgu/clients/ClientRenewalsTab.tsx`
- `src/components/sgu/clients/ClientCrossSellTab.tsx`
- `src/hooks/useSGUClientsPortfolio.ts`

**Modyfikowany:**
- `src/pages/DealsTeamDashboard.tsx` — gating SGU vs CRM dla `view=clients` + skip `<TeamStats />` w SGU clients (KPI zastępuje stats).

### Założenia/ryzyka
- Pole `is_our_policy` na `insurance_policies` — zweryfikuję, jeśli nie ma użyję samego `team_id`/`deal_team_contact_id`.
- `commission_entries` — używam YTD per `recipient_user_id` (rep) lub team-wide (partner) zależnie od roli. Trend MoM = current month vs prev month sum.
- Typy polis na badge — z `insurance_policies.policy_type` (enum/text). Mapowanie majątek/życie/OC/AC zrobię w utilu lokalnym.
- Rep filter: użyję `useSGUAccess` (`isRep`, `isPartner`) + tabela `deal_team_representative_assignments`.
- Reuse `PremiumProgress` z `src/components/sgu/PremiumProgress.tsx` (compact) — KPI per wiersz w Portfel.
- `useSGUClientsPortfolio` shared cache: jeden queryKey, wszystkie taby konsumują, staleTime 60_000.
- Mutacja „Oznacz paid" → invalidate `sgu-clients-portfolio` + `sgu-premium-progress`.
- Brak zmian DB/backend — używam istniejących tabel/RLS.

### Smoke test (po build)
1. Login partner → `/sgu/pipeline?view=clients` → 5 KPI + Tab Portfel z listą.
2. Tab Raty → filtr „Zaległe" → action „Oznacz paid".
3. Tab Odnowienia → grupa 30d → „Przygotuj odnowienie" → task w workspace.
4. Tab Cross-sell → 3 sekcje, quick action.
5. CRM (`mode='crm'`) → ten sam route (gdyby ktoś trafił) renderuje stary `ClientsTab` bez zmian.

### Build
- `npm run build` + lista zmodyfikowanych plików.

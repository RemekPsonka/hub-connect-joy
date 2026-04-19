
## Sprint SGU-03 — Prowizje (split + modyfikatory + trigger)

### Recon (round 1, READ-ONLY, równolegle)
1. `supabase--read_query` — `pg_trigger` na `deal_team_payment_schedule` (czy są istniejące triggery, których nie wolno duplikować).
2. `supabase--read_query` — `commission_base_split`: 4 rekordy per tenant (sgu_company=30, adam=35, pawel=17.5, remek=17.5)?
3. `supabase--read_query` — `information_schema.tables` dla `commission_entries`/`commissions` (musi NIE istnieć).
4. `supabase--read_query` — kolumny `deal_team_payment_schedule` (potwierdzenie typów `amount numeric`, `is_paid bool`, `client_product_id`, `tenant_id`).
5. `supabase--read_query` — kolumny `insurance_policies` (`commission_rate`, `has_handling`, `representative_user_id`, `deal_team_id`, `deal_team_contact_id`).
6. `code--view src/pages/DealsTeamDashboard.tsx` — punkt rozszerzenia ViewMode o `'entries'`.
7. `code--view src/components/layout/SGUSidebar.tsx` — gdzie dodać link „Prowizje (wpisy)".
8. `code--view src/pages/sgu/SGUAdmin.tsx` (placeholder z SGU-01) — czy rozszerzać go czy stworzyć `SGUCommissionsAdmin.tsx`.
9. `code--search_files` — gdzie renderowane są szczegóły klienta SGU (cel: wstrzyknąć `<PremiumProgress>`). Kandydaci: `ClientCard`, `TeamClientDetailDialog`, ewentualny SGU dialog.

Po reconie wypisuję 9-pkt status (OK/BRAK + krótki cytat).

### Implementacja (po reconie, jeden batch)

**A. Migracja SQL** `supabase/migrations/<ts>_sgu_03_commissions.sql` (~400 linii, dokładnie wg specu):
- `CREATE TABLE commission_entries` + 6 indexów.
- RLS enable + 4 policy (partner, rep, director, update_payout). Brak INSERT policy (trigger SECURITY DEFINER omija).
- `fn_calculate_commission_entries_for_payment()` — pełna logika Case A/B/C/D + fallback `commission_rate` z `deal_team_client_products.commission_percent` + korekta zaokrągleń (różnicę dolicza do `sgu_company`).
- `fn_delete_commission_entries_on_rollback()` — DELETE entries gdy `is_paid: true→false`, blokada gdy jakiś wpis już `paid_out=true`.
- 2 triggery `AFTER UPDATE` z `WHEN` clauses (forward + rollback).
- `rpc_mark_commission_paid_out(uuid[])` SECURITY DEFINER + GRANT EXECUTE.
- DO $$ verification block (count triggerów = 2).
- Komentarz `-- ROLLBACK:` z pełnym DROP scriptem.

**B. FE — PremiumProgress widget**
- `src/hooks/usePremiumProgress.ts` — React Query, zwraca `{ expectedGr, bookedGr, paidGr }`. 3 sub-queries (1 per `deal_team_contacts`, 1 SUM `insurance_policies.forecasted_premium`, 1 SUM `deal_team_payment_schedule.amount WHERE is_paid`).
- `src/components/sgu/PremiumProgress.tsx` — 3 horyzontalne `<Progress>` (Oczekiwany/Wystawiony/Opłacony) + procenty + `formatCompactCurrency`.
- Integracja w karcie klienta SGU (lokalizacja zależnie od recon #9 — preferuję wstrzyknięcie w `ClientCard.tsx` warunkowo `mode === 'sgu'`, lub w nowym `SGUClientDetailDialog` jeśli istnieje).

**C. FE — CommissionsTable + nowy view 'entries'**
- `src/pages/DealsTeamDashboard.tsx` — dodaj `'entries'` do `VALID_VIEWS` + render `<SGUCommissionsTable teamId={selectedTeamId}/>` gdy `viewMode === 'entries'`. Backward-safe (nowy literal w union typie).
- `src/hooks/useCommissionEntries.ts` — query + filtry (person, period, paid_out), join z `insurance_policies`, `deal_team_contacts`.
- `src/components/sgu/CommissionsTable.tsx` — tabela z filtrami, summary bar (total PLN, pending/paid count), button „Oznacz wypłacone" (tylko director/partner) → `supabase.rpc('rpc_mark_commission_paid_out', { p_entry_ids })`, export CSV.
- `src/components/layout/SGUSidebar.tsx` — w grupie LEJEK dopisz link „Prowizje (wpisy)" → `/sgu/pipeline?view=entries`. Zachowaj istniejący link `?view=commissions` (targety miesięczne).

**D. FE — Admin commissions**
- `src/pages/sgu/SGUCommissionsAdmin.tsx` (rozszerzenie `SGUAdmin.tsx` placeholder lub osobny) — tabela `commission_base_split` (read-only dla partner; edit + „Dodaj wersję splita" dla director/superadmin z versioning przez `active_to`).
- Warning gdy SUM(share_pct) ≠ 100.
- Routing: jeśli `/sgu/admin/commissions` nie istnieje w `App.tsx` z SGU-01 (tylko `/sgu/admin`) — dodam sub-route lub tab w SGUAdmin.

**E. Walidacja**
- Migracja → automatyczna regeneracja `types.ts` (nowa tabela + RPC widoczne w `Database['public']`).
- `npm run build` + `npm run lint`.
- 4 smoke testy (A/B/C/D) przez `supabase--read_query` + `psql insert` — wymagane dane testowe (testowa polisa w SGU teamie z ratą 1000 PLN, commission_rate=10). Jeśli nie ma — recon zidentyfikuje, w razie potrzeby utworzymy syntetyczne dane testowe (insert-tool, w schema CRM_TEST lub na flagę testową) lub poprosimy o oznaczenie istniejącej raty.
- RLS test: query jako rep (jeśli możliwe przez `set_config` z user JWT) — albo rekomendacja manualnej weryfikacji.

### Pliki

**Nowe (6):**
- `supabase/migrations/<ts>_sgu_03_commissions.sql`
- `src/hooks/usePremiumProgress.ts`
- `src/hooks/useCommissionEntries.ts`
- `src/components/sgu/PremiumProgress.tsx`
- `src/components/sgu/CommissionsTable.tsx`
- (opcjonalnie) `src/pages/sgu/SGUCommissionsAdmin.tsx`

**Modyfikowane (≥3):**
- `src/pages/DealsTeamDashboard.tsx` (`'entries'` w ViewMode + render)
- `src/components/layout/SGUSidebar.tsx` (nowy link)
- `src/components/deals-team/ClientCard.tsx` (wstrzyknięcie `<PremiumProgress>` w trybie SGU; alternatywnie nowy SGU dialog jeśli recon pokaże inny komponent)
- `src/App.tsx` (jeśli trzeba dodać sub-route `/sgu/admin/commissions`)
- `src/pages/sgu/SGUAdmin.tsx` (rozszerzenie placeholdera)

### Ryzyka / decyzje
- **Korekta zaokrągleń**: różnicę dolicza do `sgu_company` po pierwszym INSERT batch — zgodnie ze specem (dodatkowy UPDATE).
- **Case D fail-fast**: blokuje UPDATE do polisy z oboma modyfikatorami → user widzi DB error toast w UI. Rozważyć preflight check w FE (dialog ostrzegawczy) — **odkładam do SGU-04**, w SGU-03 trigger jest źródłem prawdy.
- **RPC `is_sgu_partner`/`is_sgu_representative`/`get_sgu_team_id`/`get_current_tenant_id`/`get_current_director_id`** — wszystkie potwierdzone w SGU-00. Jeśli recon pokaże brak — STOP.
- **Smoke testy** wymagają testowej raty — jeśli brak w bazie SGU teamu, w raporcie końcowym opiszę jak Remek może je odpalić ręcznie (z gotowymi snippetami SQL z dynamicznymi UUID).
- **CommissionsTable filtry** — `period` używa `created_at` (data oznaczenia raty paid). MVP: thisMonth/lastMonth/quarter/ytd/custom (date-range picker shadcn).

### Raport końcowy
1. Lista nowych + modyfikowanych plików.
2. Status migracji (z weryfikacją 2 triggerów).
3. `npm run build` + `npm run lint`.
4. 4 smoke testy (A/B/C/D) — oczekiwane vs faktyczne (jeśli dane testowe dostępne) lub instrukcja manualna z przygotowanymi snippetami.
5. RLS check (rep widzi tylko swoje).
6. Screenshot/opis `<PremiumProgress>` na karcie klienta.

Po Twojej akceptacji: recon (9 calls równolegle) → implementacja (1 batch) → migracja → smoke test → raport.

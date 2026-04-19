
## Sprint SGU-02 — finalna wersja po Twoich uwagach

### Recon (round 1, READ-ONLY — równolegle)
1. `supabase--read_query` — potwierdzenie kolumn `deal_team_contacts.{source_contact_id, expected_annual_premium_gr, contact_id NOT NULL, notes}` + funkcji (`rpc_sgu_get_crm_contact_basic`, `get_current_director_id`, `get_current_tenant_id`, `get_sgu_team_id`).
2. `code--view src/App.tsx` — **kluczowe wg uwagi #2**: zidentyfikować jakie guardy chronią `/contacts/:id` i `/companies/:id`.
3. `code--view src/pages/ContactDetail.tsx` + `src/pages/CompanyDetail.tsx` — gdzie wpiąć button.
4. `code--view src/components/auth/AuthGuard.tsx` — gdzie dołożyć blokadę „SGU-only user nie wchodzi w CRM deeplink".
5. `code--search_files` — `contact\.contacts\?\.|contact\.full_name|contact\.email|contact\.phone` w `src/components/deals-team/` — lista kart do refactor (oczekiwane: 6).
6. `code--search_files` — `ContactBITab|ContactAgentSection|ContactNotesPanel|LinkedInNetworkSection|ContactKnowledgeTimeline` w `src/components/deals-team/` (oczekiwane 0).
7. `code--list_dir src/components/sgu` (po SGU-01 może istnieć).
8. `code--view src/components/contacts/CompanyView.tsx` lub `useCompanyContacts` — jak pobrać listę kontaktów firmy w `CompanyDetail`.

Wypisuję 8-pkt status (OK/BRAK/cytata).

### Implementacja (po recon)

**A. Migracja** `supabase/migrations/<ts>_sgu_02_comments.sql`
- COMMENT ON COLUMN dla `source_contact_id` + `expected_annual_premium_gr`.
- **Uwaga #5**: `CREATE UNIQUE INDEX IF NOT EXISTS idx_dtc_source_unique_per_team ON public.deal_team_contacts (team_id, source_contact_id) WHERE source_contact_id IS NOT NULL;` (partial unique → DB-level idempotencja).
- ROLLBACK: `DROP INDEX IF EXISTS idx_dtc_source_unique_per_team;`

**B. Edge fn** `supabase/functions/sgu-push-contact/index.ts`
- CORS + `requireAuth`.
- `rpc('get_current_director_id')` → 403 jeśli null.
- `rpc('get_sgu_team_id')` → 500 jeśli null.
- `rpc('get_current_tenant_id')` (uwaga #1: istnieje, bez fallbacku).
- Validate contact w tenancie.
- Idempotencja: SELECT istniejącego deal_team_contact po `(team_id, source_contact_id)` → reuse.
- INSERT z `contact_id = source_contact_id`, `notes` zapisywane do `deal_team_contacts.notes` (uwaga #4).
- **Race-handling**: jeśli INSERT zwróci unique_violation (`23505`) z indexu z punktu A → re-SELECT i zwróć istniejący `id` z `created: false`.
- Response: `{ deal_team_contact_id, created }`.

**C. Hook** `src/hooks/useCRMContactBasic.ts` — React Query → `rpc_sgu_get_crm_contact_basic`, staleTime 5 min, enabled gdy contactId.

**D. Dialog** `src/components/sgu/PushToSGUDialog.tsx`
- Props: `{ contactId, contactName, open, onOpenChange }`.
- RHF + Zod: `expected_annual_premium_pln` (number ≥0), `notes` (textarea, max 500).
- Submit: PLN×100 → `supabase.functions.invoke('sgu-push-contact', { body })`.
- Sukces: toast + button „Zobacz w SGU" → `navigate('/sgu/pipeline?view=clients&highlight=' + id)`, invalidate `['deals-team-contacts']`.

**E. Dialog (multi-contact)** `src/components/sgu/PushCompanyContactDialog.tsx`
- **Uwaga #3**: jeden dialog. Props: `{ companyId, contacts: ContactRow[], open, onOpenChange }`.
- Layout: lista z `RadioGroup` (nazwisko + email/stanowisko) + pola `expected_annual_premium_pln` + `notes` poniżej (zawsze widoczne, disabled dopóki radio nie wybrane).
- Submit jak w D, z `contact_id = wybrany`.

**F. Button w `ContactDetail.tsx`**
- Warunek: `director !== null && sguTeamId !== null`.
- Dodaję prop `extraActions?: ReactNode` w `ContactDetailHeader.tsx` (1 linia w typie + `{extraActions}` w sekcji akcji obok „Edytuj"). Mniej inwazyjne niż przerabianie layoutu.
- Button (Share2 icon, „Przekaż do SGU") + state `pushOpen` + `<PushToSGUDialog/>`.

**G. Button w `CompanyDetail.tsx`**
- Pobierz kontakty firmy (z istniejącego hooka — zidentyfikuję w reconie).
- 0 → button disabled + tooltip „Firma nie ma kontaktów".
- 1 → otwiera `PushToSGUDialog` z tym kontaktem.
- ≥2 → otwiera `PushCompanyContactDialog` (jednostopniowy, uwaga #3).

**H. Reference-only w 6 kartach SGU** (lista z reconu F.5)
W każdej karcie:
```ts
const { mode } = useLayoutMode();
const isSguRef = mode === 'sgu' && !!contact.source_contact_id;
const { data: crmBasic } = useCRMContactBasic(isSguRef ? contact.source_contact_id : null);
const displayName = crmBasic?.full_name ?? contact.contact?.full_name;
// ... + Badge "Z CRM" gdy isSguRef
```

**I. AuthGuard hardening — uwaga #2 (po reconie #2 + #4)**
Jeśli recon pokaże, że `/contacts/:id` i `/companies/:id` są tylko pod `<AuthGuard>` (bez DirectorGuard/AdminGuard):
- W `src/components/auth/AuthGuard.tsx` (lub nowy `<CRMGuard>` jeśli AuthGuard nie ma odpowiedniego kontekstu) dołożyć blokadę:
  - Pobrać `useSGUAccess()` + `useAuth()` (`director`, `isAdmin`).
  - Jeśli `hasAccess && !director && !isAdmin && !isSuperadmin` oraz pathname matchuje `/contacts/:id`/`/companies/:id` → `<Navigate to="/sgu/dashboard" replace/>`.
- Alternatywa (preferowana, mniej inwazyjna): nowy komponent `<CRMOnlyGuard>` opakowujący tylko trasy CRM, bez ruszania `<AuthGuard>`. Dokładną decyzję podejmę po reconie kodu `App.tsx`/`AuthGuard.tsx`.

**J. Walidacja**
- `npm run build` + `npm run lint`.
- Smoke test edge fn przez `supabase--curl_edge_functions` (2× invoke z tym samym contactem → 1×created=true, 1×created=false; sprawdzenie response 200).
- Verify: `SELECT count(*) FROM audit_crm_contact_reads WHERE via_rpc='rpc_sgu_get_crm_contact_basic'` rośnie po otwarciu karty SGU (manualnie przez usera).

### Pliki

**Nowe (6):**
- `supabase/functions/sgu-push-contact/index.ts`
- `supabase/migrations/<ts>_sgu_02_comments.sql`
- `src/hooks/useCRMContactBasic.ts`
- `src/components/sgu/PushToSGUDialog.tsx`
- `src/components/sgu/PushCompanyContactDialog.tsx`
- (opcjonalnie) `src/components/auth/CRMOnlyGuard.tsx`

**Modyfikowane (≥9):**
- `src/App.tsx` (dołożenie CRMOnlyGuard wokół tras CRM, jeśli wybrana ta opcja)
- `src/pages/ContactDetail.tsx`
- `src/pages/CompanyDetail.tsx`
- `src/components/contacts/ContactDetailHeader.tsx` (prop `extraActions`)
- `src/components/deals-team/ClientCard.tsx`
- `src/components/deals-team/LeadCard.tsx`
- `src/components/deals-team/ProspectCard.tsx`
- `src/components/deals-team/TopLeadCard.tsx`
- `src/components/deals-team/HotLeadCard.tsx`
- `src/components/deals-team/ColdLeadCard.tsx`

### Raport końcowy
1. Lista zmodyfikowanych + nowych plików.
2. Status migracji (z indexem partial unique).
3. Wynik smoke testu edge fn (2× invoke).
4. Decyzja o CRMOnlyGuard vs modyfikacja AuthGuard (z cytatem z `App.tsx`).
5. `npm run build` + `npm run lint` output.

Po Twojej akceptacji: recon (8 calls równolegle) → implementacja → migracja → deploy fn → smoke test → raport.

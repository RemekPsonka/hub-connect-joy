
## Sprint SGU-09 — Przedstawiciele onboarding + settings

### Recon (READ-ONLY, równolegle)

**Round 1 — 5 calls równolegle:**
1. `supabase--read_query` × 4:
   - `user_roles` kolumny + enum `app_role` (potwierdzenie że 'sgu' istnieje).
   - `information_schema.tables WHERE table_name IN ('sgu_representative_profiles','sales_representatives','deal_team_representative_assignments','commission_base_split')`.
   - `commission_base_split` CHECK constraint dla `role_key` (do ALTER + LIKE 'rep:%').
   - `deal_team_representative_assignments` kolumny + UNIQUE indexy.
2. `code--search_files "inviteUserByEmail|auth\\.admin\\.(createUser|listUsers|inviteUserByEmail)"` w `supabase/functions/` — wzorzec invite z `create-representative` / `create-tenant-user`.

**Round 2 (zależnie):**
- `code--view` znalezionego edge fn z `inviteUserByEmail` — wzorzec do skopiowania.
- `code--view src/pages/sgu/SGURepresentatives.tsx` (placeholder z SGU-01) + `src/pages/sgu/SGUAdmin.tsx`.
- `code--view src/components/layout/SGUSidebar.tsx` (lines 50-90) — gdzie dodać linki Admin „Przedstawiciele" + „Przypisania".
- `code--view src/App.tsx` (lines 150-180) — punkt wpięcia route `/setup-sgu` (top-level, nie w SGULayout) + 2 routes w SGULayout.
- `code--view src/contexts/AuthContext.tsx` lub `src/hooks/useAuth.ts` — gdzie dodać redirect `onboarded_at IS NULL → /setup-sgu`.
- `supabase--read_query` — `is_sgu_partner()`, `has_sgu_access()`, `get_current_tenant_id()` (potwierdzenie helperów z SGU-00).

### Implementacja

**A. Migracja SQL** `supabase/migrations/<ts>_sgu_09_representatives.sql`:
1. `CREATE TABLE sgu_representative_profiles`:
   - `id uuid PK default gen_random_uuid()`, `user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `tenant_id uuid NOT NULL`, `team_id uuid REFERENCES deal_teams(id)`, `first_name text NOT NULL`, `last_name text NOT NULL`, `email text NOT NULL`, `phone text`, `region text`, `notes text`, `active boolean NOT NULL DEFAULT true`, `invited_at timestamptz NOT NULL DEFAULT now()`, `invited_by_user_id uuid REFERENCES auth.users(id)`, `onboarded_at timestamptz`, `deactivated_at timestamptz`, `deactivated_reason text`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`.
   - Indexy: `(tenant_id, active)`, `(team_id, active)`, `(user_id)`.
2. RLS enable + 4 policies:
   - `srp_select_partner`: `is_sgu_partner() OR get_current_director_id() IS NOT NULL OR is_superadmin()` (widoczność wszystkich repów w tenancie).
   - `srp_select_own`: `auth.uid() = user_id` (rep widzi tylko siebie).
   - `srp_write_partner`: INSERT/DELETE/UPDATE dla partner+director+superadmin.
   - `srp_update_own`: UPDATE z restrykcją kolumn (rep może edytować phone/notes; nie active/team_id/email).
3. ALTER `commission_base_split`: DROP CHECK, ADD CHECK z dodaniem `role_key LIKE 'rep:%'` obok istniejących role_key (rep/handling/sgu/adam/pawel/remek).
4. `rpc_sgu_deactivate_representative(p_user_id uuid, p_reason text)` SECURITY DEFINER:
   - Auth: `is_sgu_partner() OR is_superadmin()`.
   - UPDATE `sgu_representative_profiles SET active=false, deactivated_at=now(), deactivated_reason=p_reason`.
   - DELETE `user_roles WHERE user_id=p_user_id AND role='sgu'`.
   - UPDATE `deal_team_representative_assignments SET active=false, deactivated_at=now() WHERE representative_user_id=p_user_id AND active=true`.
5. `rpc_sgu_reactivate_representative(p_user_id uuid)` SECURITY DEFINER:
   - INSERT `user_roles(user_id, role) VALUES (p_user_id, 'sgu') ON CONFLICT DO NOTHING`.
   - UPDATE `sgu_representative_profiles SET active=true, deactivated_at=NULL, deactivated_reason=NULL`.
   - Bez przywracania assignments (rep musi być re-assigned przez partnera).
6. GRANT EXECUTE TO authenticated.
7. Komentarz inline: instrukcja konfiguracji email template w Supabase Dashboard (Subject + redirect URL).

**B. Edge fn** `supabase/functions/sgu-invite-representative/index.ts`:
- `requireAuth` + sprawdzenie `is_sgu_partner` lub director przez RPC.
- Body validation Zod: `email`, `first_name`, `last_name`, `phone?`, `region?`.
- `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { full_name, role: 'sgu' }, redirectTo: SITE_URL + '/setup-sgu' })`.
- Obsługa duplikatu (`User already registered`): `auth.admin.listUsers({ email })` → użyj istniejącego user.id, tylko dodaj rolę.
- INSERT `user_roles(user_id, role='sgu')` ON CONFLICT DO NOTHING.
- INSERT `sgu_representative_profiles(user_id, tenant_id, first_name, last_name, email, phone, region, invited_by_user_id)`.
- Response `{ success: true, user_id }` — bez tempPassword w response/logach.
- ENV: `SITE_URL` (reuse jeśli istnieje, inaczej `Deno.env.get('SITE_URL') ?? 'https://hub-connect-joy.lovable.app'`).

**C. FE — nowe pliki (12):**
- `src/types/sgu-representative.ts` — `SGURepresentativeProfile`, `RepAssignment`, `InviteRepInput`.
- `src/hooks/useSGURepresentatives.ts` — query lista (filter by status: active/all/deactivated).
- `src/hooks/useInviteRep.ts` — mutation wywołująca edge fn.
- `src/hooks/useDeactivateRep.ts` + `useReactivateRep` — RPC mutations.
- `src/hooks/useRepAssignments.ts` — query + mutations (assign/unassign przez UPDATE `deal_team_representative_assignments`).
- `src/hooks/useRepProfile.ts` — single rep profile + commission override CRUD na `commission_base_split` z `role_key='rep:<uid>'`.
- `src/components/sgu/InviteRepDialog.tsx` — RHF + Zod, submit → `useInviteRep`.
- `src/components/sgu/RepCard.tsx` — wiersz tabeli (avatar, imię/nazwisko, region, badge active, action menu Edit/Deactivate/Reactivate).
- `src/components/sgu/RepSettingsPanel.tsx` — Sheet z edycją profilu + commission override (slider 0-30%) + przycisk Deactivate (AlertDialog).
- `src/components/sgu/AssignmentBoard.tsx` — dnd-kit DndContext + 2+ kolumny (Nieprzypisane + per active rep), karty `deal_team_contacts` przeciągalne.
- `src/pages/sgu/SGUAssignments.tsx` — wrapper na AssignmentBoard.
- `src/pages/SetupSGU.tsx` — top-level page (nie w SGULayout); 4-step Stepper:
  - Step 1: Welcome (logo SGU + opis).
  - Step 2: Hasło (RHF, `supabase.auth.updateUser({ password })`).
  - Step 3: Profil (pre-fill z `sgu_representative_profiles` po `auth.uid()`, edycja phone/region/notes).
  - Step 4: Done → UPDATE `onboarded_at=now()` → redirect `/sgu/pipeline?view=tasks`.

**D. FE — modyfikacje (4):**
- `src/pages/sgu/SGURepresentatives.tsx` — pełna przebudowa z placeholder: header z buttonem „Zaproś przedstawiciela", `<Tabs>` (Active/All/Deactivated), `<Table>` z `<RepCard>`, side `<Sheet>` z `<RepSettingsPanel>`.
- `src/App.tsx` — dodaj `<Route path="/setup-sgu" element={<SetupSGU/>} />` (top-level, w `AuthGuard` ale poza `AppLayout`/`SGULayout`); w drzewie `SGULayout` dodaj `<Route path="/sgu/admin/representatives" element={<SGURepresentatives/>}/>` + `<Route path="/sgu/admin/assignments" element={<SGUAssignments/>}/>`.
- `src/components/layout/SGUSidebar.tsx` — dodaj do `adminItems`: `{ title: 'Przedstawiciele', url: '/sgu/admin/representatives', icon: Users }`, `{ title: 'Przypisania', url: '/sgu/admin/assignments', icon: UserPlus }`.
- `src/contexts/AuthContext.tsx` lub `src/components/auth/PostLoginRedirect.tsx` — dodaj logikę: jeśli user ma rolę 'sgu' i `sgu_representative_profiles.onboarded_at IS NULL` → redirect `/setup-sgu` (chyba że już tam jest).

### Pliki

**Nowe (13):**
- `supabase/migrations/<ts>_sgu_09_representatives.sql`
- `supabase/functions/sgu-invite-representative/index.ts`
- `src/types/sgu-representative.ts`
- `src/hooks/useSGURepresentatives.ts`
- `src/hooks/useInviteRep.ts`
- `src/hooks/useDeactivateRep.ts`
- `src/hooks/useRepAssignments.ts`
- `src/hooks/useRepProfile.ts`
- `src/components/sgu/InviteRepDialog.tsx`
- `src/components/sgu/RepCard.tsx`
- `src/components/sgu/RepSettingsPanel.tsx`
- `src/components/sgu/AssignmentBoard.tsx`
- `src/pages/sgu/SGUAssignments.tsx`
- `src/pages/SetupSGU.tsx`

**Modyfikowane (4):**
- `src/pages/sgu/SGURepresentatives.tsx` (full rebuild)
- `src/App.tsx` (3 routes)
- `src/components/layout/SGUSidebar.tsx` (2 admin links)
- `src/components/auth/PostLoginRedirect.tsx` (lub `AuthContext.tsx`) — onboarding redirect

### Ryzyka / decyzje

- **`deal_team_representative_assignments` kolumny**: Recon krytyczny — czy istnieje `active`, `deactivated_at`, UNIQUE na `(deal_team_contact_id) WHERE active`. Jeśli brak — migracja musi je dodać. Mitigation: wczytuję schema przed napisaniem `useRepAssignments`.
- **`commission_base_split` CHECK constraint**: DROP+ADD musi zachować istniejące role_key ('rep','handling','sgu','adam','pawel','remek'). Po recone sklejam pełną listę + `OR role_key LIKE 'rep:%'`.
- **Email template — auth invite**: Lovable Cloud ma własny system email (auth-email-hook). Ale zgodnie ze specem Remek konfiguruje template **manualnie** w Supabase Dashboard (Subject po polsku + redirect URL). W migracji dodaję komentarz `-- TODO REMEK MANUAL: Authentication → Email Templates → Invite user`. Nie scaffoluję `auth-email-hook` automatycznie (to oddzielny scope, wymaga `email_domain--scaffold_auth_email_templates` z osobnym potwierdzeniem domeny).
- **`SetupSGU` route — guards**: musi być w `AuthGuard` (wymaga sesji po magic link) ale **POZA** `SGULayout` (rep nie ma jeszcze pełnego dostępu sidebara). Rozwiązanie: route na top-level w drzewie obok `/login`, ale wewnątrz `<AuthGuard>` (bez `<AppLayout>`/`<SGULayout>`).
- **Onboarding redirect — `PostLoginRedirect`**: dodaję check `if (sguRole && !onboarded_at) navigate('/setup-sgu')`. Kolejność: rep (sgu) z `onboarded_at IS NULL` → /setup-sgu; rep z `onboarded_at` → /sgu/pipeline; partner → /sgu/dashboard; director → /. Wymaga query do `sgu_representative_profiles` po user.id (małe — 1 row).
- **Commission override per rep**: reuse `commission_base_split` z `role_key='rep:<user_id>'` zamiast osobnej tabeli. RepSettingsPanel → slider 0-30% → INSERT/UPDATE wpis. Trigger SGU-03 `fn_calculate_commission_entries_for_payment` musi już to obsługiwać przez wzorzec `LIKE 'rep:%'` — sprawdzam w reconie czy potrzebuje update'u.
- **Dnd-kit AssignmentBoard**: 2+ kolumny (Nieprzypisane + per rep). Drag karty `deal_team_contact` → onDrop → mutation: jeśli istnieje aktywny assignment, deactivate go + INSERT nowy z `representative_user_id=newRep`. Optimistic update przez React Query.
- **`SGURepresentatives.tsx` placeholder**: trzeba sprawdzić czy nie istnieje już z SGU-01. Jeśli tak — full rebuild zachowując route name.
- **Rate limit invite**: max 10 invitów/dzień per partner (przez `_shared/rateLimit.ts`). Zapobiega spamowi.
- **Realtime assignments**: opcjonalne — w MVP nie subskrybuję, partner odświeża stronę po drag-drop. React Query invalidate wystarczy.

### Raport końcowy
1. Lista plików (13 nowych + 4 modyfikowane, absolute paths).
2. Status migracji + status deploy edge fn `sgu-invite-representative`.
3. Wyniki 5-pkt reconu (zwłaszcza commission_base_split CHECK + deal_team_representative_assignments schema).
4. Smoke 1 Invite: SQL — nowy auth.users + user_roles SGU + sgu_representative_profiles z invited_at.
5. Smoke 2 Setup: Jan → /setup-sgu → 4 kroki → onboarded_at NOT NULL + redirect /sgu/pipeline.
6. Smoke 3 Assign: drag-drop → deal_team_representative_assignments active=true z rep=Jan; Jan widzi klienta w /sgu/pipeline?view=tasks.
7. Smoke 4 Deactivate: profile.active=false, user_roles SGU usunięty, assignments active=false; rep próbuje /sgu/* → redirect.
8. Weryfikacja RLS: rep SELECT → 1 wiersz (own); partner SELECT → wszystkie tenant repów.
9. Email template: raport „TODO MANUAL Remek — Subject + Additional Redirect URL". Lovable nie scaffoluje auth-email-hook (out of scope, osobny dialog domeny).
10. `npm run build` + `npm run lint`.

Po Twojej akceptacji: recon (5 calls + round 2 conditional) → migracja SQL → edge fn deploy → FE batch (13 nowych + 4 modyfikowane) → smoke 4 scenariuszy → raport.

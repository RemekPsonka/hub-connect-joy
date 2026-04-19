
## Diagnoza — dlaczego Remigiusz nie ma dostępu do SGU

**Stan użytkownika `remek@ideecom.pl` (Remigiusz Psonka, `bec7a137...`):**
- ✅ Ma rolę `owner` w `user_roles`
- ✅ Jest dyrektorem (`directors.user_id` = jego id, tenant `dd293205...`)
- ✅ Jest członkiem zespołu SGU (`deal_team_members.team_id = 9842c3d4...` = `sgu_team_id`)
- ❌ **Brak roli `sgu` w `user_roles`** — `is_sgu_partner()` wymaga BOTH: rola `sgu` AND `deal_team_members.role = 'partner'`
- ❌ **Ma `role = 'member'` zamiast `'partner'`** w deal_team_members

**Dlaczego linki nie działają:** `SGUAccessGuard` woła `useSGUAccess` → `is_sgu_partner` zwraca `false` (brak roli `sgu` + role `member` zamiast `partner`) i `is_sgu_representative` też `false` (nie ma assignmentów). Mimo że `useOwnerPanel().isAdmin = true` powinno to przepuścić — ale po dodaniu przycisku „Przejdź do SGU" w sidebarze nie pomoże jeśli klikniesz w linki wewnątrz SGU (np. /sgu/admin/representatives), bo każdy guard sprawdza te same warunki. **Dodatkowo `enable_sgu_layout=true` więc tenant ma SGU włączone — wszystko gotowe poza rolą.**

## Co zrobić

**Migracja danych (insert/update):**
```sql
-- 1. Dodaj rolę 'sgu' do Remigiusza (przy owner — kumulatywnie)
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('bec7a137-ec33-4cb6-b13c-3a47d9e53972', 'sgu', 'dd293205-6dc1-438e-ad8e-4fd7cdf8f6e5')
ON CONFLICT DO NOTHING;

-- 2. Promuj go na 'partner' w zespole SGU (team 9842c3d4...)
UPDATE public.deal_team_members
SET role = 'partner'
WHERE director_id = '98a271e8-d923-49cb-a6aa-45f3ac0064d8'
  AND team_id = '9842c3d4-c2a4-4d2b-9e35-afa7fb8d6a57';
```

Po tym `is_sgu_partner()` zwróci `true` → wszystkie guardy SGU przepuszczą + `useSGUAccess` zwróci `isPartner=true` → przycisk „Przejdź do SGU" w sidebarze CRM też się pojawi (już jest dla `isAdmin`, ale teraz dodatkowo jako partner).

## Weryfikacja
1. Po insercie: `SELECT public.is_sgu_partner();` z sesją Remigiusza powinno zwrócić `true`.
2. UI: refresh + klik „Przejdź do SGU" → `/sgu/dashboard` ładuje się bez redirectu.
3. Linki `/sgu/admin/representatives`, `/sgu/admin/assignments`, `/sgu/reports` — wszystkie otwierają się.

## Pliki
Brak zmian w kodzie — to **tylko data fix** (2 SQL: 1 INSERT + 1 UPDATE) na istniejących tabelach `user_roles` + `deal_team_members`. Bez migracji schema.

## Ryzyka
- `user_roles` może mieć unique constraint na `(user_id, role, tenant_id)` — `ON CONFLICT DO NOTHING` to obsłuży.
- Promocja na `partner` daje Remigiuszowi pełne uprawnienia partnerskie SGU (widzi wszystkich repów, może zapraszać, dezaktywować). Zgodnie z intencją (Remigiusz jako właściciel/dyrektor = partner).

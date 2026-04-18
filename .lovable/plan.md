

# Sprint 09 — Audit log unification (zaadaptowany)

## Korekty względem sprint MD

**Realne schematy 7 tabel ≠ sprint MD:**
| Tabela | Wierszy | Faktyczne kolumny vs sprint MD |
|---|---|---|
| `task_activity_log` | 122 | brak `diff` — jest `old_value/new_value/metadata` |
| `task_workflow_history` | 0 | brak `from_status/to_status/changed_by/action` — jest `step_id/completed_by/completed_at/notes` |
| `deal_team_activity_log` | 90 | brak `diff/metadata/deal_team_id` — jest `team_id/team_contact_id/prospect_id/old_value/new_value/note` |
| `deal_history` | 7 | brak `changes` — jest `field_name/old_value/new_value/old_stage_id/new_stage_id` |
| `contact_activity_log` | 2810 | brak `actor_id/action/diff` — jest `activity_type/description/metadata` |
| `contact_merge_history` | 244 | brak `target_contact_id/source_contact_ids/merged_by` — jest `primary_contact_id/merged_contact_data/ai_integrated_fields/merge_source` |
| `role_audit_log` | 5 | brak `user_id/role/previous_role/actor_id` — jest `target_user_id/changed_by_user_id/old_role/new_role/details` |

Backfill **przepisuję od nowa** do realnych kolumn. Łącznie ~3278 wierszy do migracji.

**Edge functions piszą do tych tabel** (4 fn): `generate-contact-profile`, `merge-contacts`, `initialize-contact-agent`, `bulk-merge-contacts`, `sovra-weekly-report` (read), `delete-tenant` (cleanup), + komponent FE `NextActionDialog` insertuje do `task_activity_log`. **Wszystkie muszą zostać przepięte na nowy `audit_log` w tej samej migracji**, inaczej deploy fn padnie.

**Brak triggerów logujących** w DB — sprint MD pkt 5 ("zastąp triggery generic triggerem") nieaktualny, pomijam.

## A. Migracja SQL `supabase/migrations/<ts>_sprint09_audit_log.sql`

1. `archive.<7 tabel>_backup_20260418` (CREATE TABLE AS).
2. `RAISE NOTICE` z liczbą wierszy każdej.
3. `CREATE TABLE public.audit_log (id uuid, tenant_id, entity_type, entity_id, actor_id, action, diff jsonb, metadata jsonb, created_at, PRIMARY KEY(id, created_at)) PARTITION BY RANGE (created_at)`.
4. 13 partycji: `pre_2026` + `2026_01..2026_12`.
5. Indeksy: `(tenant_id, entity_type, entity_id, created_at DESC)`, `(actor_id, created_at DESC)`.
6. RLS: SELECT/INSERT po `tenant_id = get_current_tenant_id()`.
7. **Backfill (przepisany na realne kolumny):**
   - `task_activity_log` → entity_type='task', diff=`jsonb_build_object('old', old_value, 'new', new_value)`, metadata=metadata.
   - `task_workflow_history` → 0 wierszy, INSERT pominięty (lub trywialny WHERE).
   - `deal_team_activity_log` → entity_type='deal_team', entity_id=`COALESCE(team_contact_id, team_id)`, diff=`jsonb_build_object('old', old_value, 'new', new_value)`, metadata=`jsonb_build_object('team_id', team_id, 'team_contact_id', team_contact_id, 'prospect_id', prospect_id, 'note', note)`.
   - `deal_history` → entity_type='deal', actor_id=changed_by, action='update', diff=`jsonb_build_object('field', field_name, 'old', old_value, 'new', new_value)`, metadata=`jsonb_build_object('old_stage_id', old_stage_id, 'new_stage_id', new_stage_id)`.
   - `contact_activity_log` → entity_type='contact', actor_id=NULL (brak w schemie), action=activity_type, diff='{}'::jsonb, metadata=`metadata || jsonb_build_object('description', description)`.
   - `contact_merge_history` → entity_type='contact', entity_id=primary_contact_id, actor_id=NULL, action='merge', metadata=`jsonb_build_object('merged_contact_data', merged_contact_data, 'ai_integrated_fields', ai_integrated_fields, 'merge_source', merge_source)`.
   - `role_audit_log` → entity_type='role', entity_id=target_user_id, actor_id=changed_by_user_id, action=action, metadata=`jsonb_build_object('old_role', old_role, 'new_role', new_role, 'details', details)`.
8. `CREATE FUNCTION public.log_entity_change(p_entity_type, p_entity_id, p_actor_id, p_action, p_diff, p_metadata) RETURNS uuid` (SECURITY INVOKER, search_path=public).
9. **DROP CASCADE 7 tabel**.
10. `RAISE NOTICE` z `COUNT(*) FROM audit_log`.
11. Komentarz `-- ROLLBACK:` z restore z archive.

## B. Frontend

**Nowy `src/hooks/useAuditLog.ts`:**
- `useAuditLog({ entityType, entityId, limit = 50 })` → SELECT z `audit_log`, ORDER BY created_at DESC.
- `useAuditLogByActor(actorId)` (opcjonalne — dla RoleAuditLog widget).

**Edycje (przepięcie czytników):**
- `src/components/contacts/ContactHistoryTab.tsx` → `useContactActivityLog` → `useAuditLog({entityType:'contact', entityId})`. Adapter mapujący nowe pola na stary render UI (description z metadata).
- `src/hooks/useContacts.ts` → `useContactActivityLog` przepisać na `audit_log` (zachować nazwę dla kompatybilności z `ContactHistoryTab`).
- `src/hooks/useContactActivityLog.ts` (czyta `deal_team_activity_log`!) → przepisać na `audit_log` z `entity_type='deal_team'`.
- `src/hooks/useTaskActivityLog.ts` → przepisać na `audit_log` (entity_type='task'), zachować named export.
- `src/hooks/useRoleAuditLog.ts` → przepisać na `audit_log` (entity_type='role'), join do directors po actor_id.
- `src/hooks/useMyDayData.ts` → `contact_activity_log` → `audit_log` WHERE entity_type='contact'.
- `src/hooks/useDuplicateCheck.ts` → INSERT do `contact_merge_history` zamienić na `log_entity_change('contact', primaryId, NULL, 'merge', '{}', metadata)`. Update `contact_activity_log` przy transferze → `audit_log` (zostawić bez zmian jeśli tylko przeniesienie contact_id — ale tabela nie istnieje, więc zmienić na UPDATE audit_log SET entity_id=primary WHERE entity_type='contact' AND entity_id=dup).
- `src/components/deals-team/NextActionDialog.tsx` → INSERT `task_activity_log` → `log_entity_change('task', taskId, actorId, 'recycled', ...)`.
- `src/hooks/useDealsTeamContacts.ts` → INSERT `deal_team_activity_log` → `log_entity_change('deal_team', team_contact_id, actor, action, ...)`.

## C. Edge Functions (przepięcie)

- `supabase/functions/generate-contact-profile/index.ts` → `contact_activity_log` insert → `log_entity_change` RPC lub bezpośredni INSERT do `audit_log` (z `tenant_id`).
- `supabase/functions/merge-contacts/index.ts` → 2 inserty (`contact_merge_history` + `contact_activity_log`) → `audit_log`.
- `supabase/functions/initialize-contact-agent/index.ts` → `contact_activity_log` insert → `audit_log`.
- `supabase/functions/bulk-merge-contacts/index.ts` → `contact_activity_log` UPDATE w pętli przepiąć na `audit_log`; insert do `contact_merge_history` → `audit_log`.
- `supabase/functions/sovra-weekly-report/index.ts` → SELECT z `contact_activity_log` → `audit_log WHERE entity_type='contact'`.
- `supabase/functions/delete-tenant/index.ts` → tablica cleanup table list: usunąć `contact_merge_history`, dodać `audit_log`.

## D. Kolejność wykonania

1. SQL migracja (archive → table+RLS+partycje → backfill → log_entity_change → DROP).
2. `useAuditLog.ts` + przepisanie 4 hooków FE (zachowane sygnatury exportów).
3. Przepięcie 6 edge functions + redeploy.
4. Przepięcie 2 komponentów FE (`NextActionDialog`, `useDealsTeamContacts`).
5. Sanity SQL: `SELECT entity_type, COUNT(*) FROM audit_log GROUP BY 1`.

## E. DoD
- [ ] 7 tabel nie istnieje w `public`, są w `archive.*_backup_20260418`.
- [ ] `audit_log` z 13 partycjami + RLS.
- [ ] `COUNT(audit_log) ≈ 3278` (122+0+90+7+2810+244+5).
- [ ] `useAuditLog` zwraca dane dla contact/task/deal/deal_team/role.
- [ ] `ContactHistoryTab` renderuje listę.
- [ ] 6 edge fn deployed bez błędów (referencje do starych tabel zniknęły).
- [ ] `NextActionDialog` recycle → wpis w `audit_log` entity_type='task'.

## F. Ryzyka
- **R1**: `contact_activity_log` nie ma `actor_id` → wszystkie 2810 historycznych wpisów mają actor=NULL. Akceptowalne (audit log to historia, nie do zmiany).
- **R2**: `deal_team_activity_log.entity_id` — wybieram `team_contact_id` jako primary, `team_id` w metadata. Jeśli oba NULL → SKIP (WHERE clause).
- **R3**: Edge fn redeploy w trakcie migracji — krótkie okno gdzie stare tabele już zniknęły a fn jeszcze ze starym kodem. Mitigacja: deploy fn ZARAZ po migracji w tej samej iteracji.
- **R4**: `bulk-merge-contacts` używa `contact_activity_log` w cleanup list (FK transfer). Trzeba zamienić na `audit_log` UPDATE z entity_type filter.
- **R5**: Partycja `pre_2026` przyjmie historyczne 2810+ wierszy (większość pewnie z 2025). PRIMARY KEY (id, created_at) wymaga created_at IS NOT NULL — dodam `WHERE created_at IS NOT NULL` w backfillu.


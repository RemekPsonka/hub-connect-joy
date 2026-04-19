

## Sprint 14 — GCal: write + sync + szyfrowanie (zaadaptowany)

### Co już jest (NIE duplikujemy)
- `gcal_tokens` (refresh_token plain) + `gcal-auth` (init/callback/disconnect) + `gcal-events` (read live z Google API).
- UI: Settings → Integrations tab z connect/disconnect (per `useGoogleCalendar.ts`).
- CalendarWidget + `useGCalEvents` (live fetch z Google, bez cache w DB).

### Korekty względem MD
1. **Nie tworzę `google_integrations`** — używam istniejącego `gcal_tokens`. Dodaję kolumny: `refresh_token_encrypted bytea`, `refresh_token_nonce bytea`. Migracja zaszyfruje istniejące, potem `RENAME refresh_token → deprecated_refresh_token_20260419` (per project rules: nie DROP, tylko rename).
2. **Tworzę `gcal_events`** (cache) — nie `google_events`. Konwencja `gcal_*` zgodna z istniejącą.
3. **OAuth flow zostaje** — `gcal-auth` już go ma. Nie tworzę `gcal-oauth-init/callback`.
4. **Sync cron** — używam helpera `schedule_edge_function` ze Sprint pg_cron. Co 15 min wywołuje nowy `gcal-sync-events`.
5. **Push/write** — nowa fn `gcal-push-event`. Wymaga rozszerzenia scope o `calendar.events` (write). User będzie musiał reconnect po deploy.
6. **Sovra tool** — `create_calendar_event` w `_shared/sovra-tools.ts` + handler w `sovra-confirm` (Sprint 5 confirmation pattern).
7. **Pgsodium** — używam `vault` (już mamy z pg_cron). Helper `encrypt_gcal_token(text)` / `decrypt_gcal_token(bytea, bytea)` SECURITY DEFINER.
8. **Meeting form checkbox** — sprawdzę istniejący `MeetingForm`/`ConsultationForm` przed implementacją.

### A. Migracja `<ts>_sprint14_gcal_write_sync.sql`
- `CREATE EXTENSION IF NOT EXISTS pgsodium;`
- Snapshot: `archive.gcal_tokens_backup_20260419 AS SELECT * FROM gcal_tokens;`
- ALTER `gcal_tokens` ADD `refresh_token_encrypted bytea`, `refresh_token_nonce bytea`, `scopes text[]`.
- Backfill: zaszyfruj istniejące refresh_token → encrypted/nonce (kluczem z `vault.secrets`).
- ALTER `gcal_tokens` RENAME `refresh_token` TO `deprecated_refresh_token_20260419`, RENAME `access_token` TO `deprecated_access_token_20260419` (access tokens i tak są krótkożyjące — zawsze refresh on-demand).
- CREATE TABLE `public.gcal_events` (id, tenant_id, director_id, gcal_event_id, calendar_id, summary, description, location, start_at, end_at, attendees jsonb, html_link, synced_at, UNIQUE(director_id, gcal_event_id)).
- RLS: own-only via `get_current_director_id()`.
- Indeks `(director_id, start_at)`.
- Functions: `private.encrypt_gcal_token(text)` / `private.decrypt_gcal_token(bytea, bytea)` — SECURITY DEFINER, klucz z `vault.decrypted_secrets WHERE name='gcal_token_key'`.
- Cron: `SELECT schedule_edge_function('gcal_sync_events_15min', '*/15 * * * *', '/functions/v1/gcal-sync-events', '{}');`
- ROLLBACK skomentowany.

### B. Vault secret
- Wymagane: `gcal_token_key` (32-byte random) w Vault. Migracja sprawdza istnienie; jeśli brak — INSERT z `pgsodium.crypto_secretbox_keygen()`.

### C. Edge functions

**Modyfikacja `gcal-auth/index.ts`**:
- SCOPES: dodaj `https://www.googleapis.com/auth/calendar.events` (write).
- Zapis refresh_token: wywołaj `private.encrypt_gcal_token` przed UPSERT, zapisz do nowych kolumn.
- Helper `getValidAccessToken(directorId)` (też w `_shared/gcal.ts`): decrypt → POST do Google token endpoint → return access_token.

**Nowy `_shared/gcal.ts`**:
- `getValidAccessToken(serviceClient, directorId)` — wspólny helper dla sync/push/events.

**Nowy `gcal-sync-events/index.ts`**:
- Wywoływane przez cron (service role auth). Iteruje `gcal_tokens`, dla każdego: getAccessToken → events.list (timeMin = now - 7d, timeMax = now + 30d, każdy `selected_calendars`) → UPSERT do `gcal_events`.
- Logging do `audit_log`.

**Nowy `gcal-push-event/index.ts`**:
- POST `{calendar_id, summary, description?, start, end, attendees?[], location?}`. Zod validation.
- `requireAuth` + `getValidAccessToken(director.id)`.
- POST do Google `calendars/{cal}/events`.
- INSERT do `gcal_events` z otrzymanym `id` z Google.
- Zwraca event + html_link.

**Modyfikacja `gcal-events/index.ts`**:
- Read-path: jeśli świeży cache w `gcal_events` (synced_at < 15min) → zwróć z DB, inaczej fallback live API. (Drop-in performance boost.)

### D. Sovra tool
**Modyfikacja `_shared/sovra-tools.ts`**:
- Nowy tool `create_calendar_event` z params: `summary`, `start_iso`, `end_iso`, `attendees_emails?`, `description?`. Marked `requires_confirmation: true`.

**Modyfikacja `sovra-confirm/index.ts`**:
- Handler `create_calendar_event` → invoke `gcal-push-event` z primary calendar ID (z `gcal_tokens.selected_calendars[0]` lub `'primary'`).

### E. Frontend

**Modyfikacja `src/hooks/useGoogleCalendar.ts`**:
- Nowy mutation `useGCalPushEvent({calendar_id, summary, start, end, ...})` wywołujący `gcal-push-event`.

**Modyfikacja meeting form** (sprawdzę: `src/components/meetings/MeetingForm.tsx` lub `ConsultationForm.tsx`):
- Checkbox „Zapisz w Google Calendar" (default checked jeśli `isConnected`).
- Po submit meeting → jeśli zaznaczony → `useGCalPushEvent`.

**Settings UI** — zostaje istniejące (`/settings?tab=integrations`). Dodam tylko info „Wymagane uprawnienia: kalendarz (zapis)". Po deploy MD scope-update → user zobaczy „Reconnect required" jeśli `scopes` w DB nie zawiera `calendar.events`.

### F. Kolejność
1. Migracja SQL (pgsodium + encrypted columns + gcal_events + cron + vault key).
2. `_shared/gcal.ts` helper.
3. Modyfikacja `gcal-auth` (write scope + encrypted store).
4. `gcal-sync-events` + `gcal-push-event`.
5. Modyfikacja `gcal-events` (cache-first).
6. Sovra tool + confirm handler.
7. `useGCalPushEvent` + checkbox w meeting form.
8. Update memory `mem://features/calendar-module`.

### G. DoD
- [ ] `gcal_tokens.refresh_token` zaszyfrowany; stara kolumna `deprecated_*`.
- [ ] `gcal_events` tabela z RLS + indeksem.
- [ ] Cron `gcal_sync_events_15min` zaplanowany.
- [ ] Reconnect z nowym scope `calendar.events` działa.
- [ ] Tworzenie meeting z checkbox → event w Google Calendar.
- [ ] Sovra `create_calendar_event` → confirmation → realny event.
- [ ] CalendarWidget szybciej (cache-first).

### H. Ryzyka
- **R1** Pgsodium może wymagać superuser do `CREATE EXTENSION` — w Lovable Cloud powinno działać. Fallback: użyć `vault` jako prymitywnego key store + AES-GCM w aplikacji.
- **R2** Backfill istniejących refresh_token: jeśli `vault.crypto_aead_det_encrypt` zawiedzie → zostawiamy plain w `deprecated_refresh_token_20260419` i nowi userzy reconnectują.
- **R3** Sync co 15 min × N directorów × M kalendarzy = potencjalnie wiele requestów do Google. Mitygacja: limit `selected_calendars` per user; rate-limit per director.
- **R4** Reconnect required po scope-update — user musi sam kliknąć „Połącz ponownie". Dodam banner w Settings: „Brak uprawnień zapisu — połącz ponownie".
- **R5** Sovra `create_calendar_event` wymaga że primary calendar jest w `selected_calendars` lub fallback `'primary'`. Użyję `'primary'` jeśli brak.


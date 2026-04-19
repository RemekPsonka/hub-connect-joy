
## Sprint 16 — Gmail full sync (zaadaptowany)

### Co już mamy (NIE duplikujemy)
- `gcal_tokens` z encrypted refresh + Gmail scopes (S15) + `_shared/gmail.ts` + `getValidAccessToken`.
- `gmail_outbox` (wysłane/szkice) — do listy „Sent" w `/inbox` reuse.
- `pg_cron` + helper `schedule_edge_function` (Vault-based).
- `ContactDetail` z tabami + `useGmail.ts` (outbox).

### Korekty względem MD
1. **`actor_id` → `director_id`** w nowych tabelach (zgodne z `gmail_outbox`, `gcal_*`, RLS helpers).
2. **`google_integrations` → `gcal_tokens`** dla access_token (jeden Google account). `last_gmail_history_id` trzymam w nowej kolumnie `gcal_tokens.gmail_history_id text` (zamiast generic `metadata`).
3. **Cron przez `schedule_edge_function`** (nie raw `cron.schedule` z `app.edge_url` — ten nie istnieje w naszym setupie).
4. **Match contact** — po `from`/`to` adresie z `contacts.email` OR `contacts.email_secondary` (per `director_id`). Jeśli wiele matches → pierwszy (deterministyczny).
5. **Storage body** — `body_plain` i `body_html` jak w MD; parser RFC2822 base64-decoded z payload Gmail API.
6. **Sovra `search_emails`** — nowy tool (nie istnieje, MD myli z istniejącym stub). Confirmation NIE wymagana (read-only).

### A. Migracja `<ts>_sprint16_gmail_sync.sql`
- `archive.tables_snapshot_20260419_s16` (snapshot info_schema).
- ALTER `gcal_tokens` ADD `gmail_history_id text`, `gmail_initial_synced_at timestamptz`.
- CREATE `public.gmail_labels` (id, tenant_id, director_id, gmail_label_id, name, type, color jsonb, UNIQUE(director_id, gmail_label_id)) + RLS own.
- CREATE `public.gmail_threads` (id, tenant_id, director_id, gmail_thread_id, history_id, subject, snippet, last_message_at, message_count, contact_id FK SET NULL, label_ids text[], is_unread bool, UNIQUE(director_id, gmail_thread_id)) + 2 indeksy + RLS own.
- CREATE `public.gmail_messages` (id, tenant_id, director_id, thread_id FK CASCADE, gmail_message_id, "from", "to", cc, bcc, subject, body_plain, body_html, date, labels text[], raw_headers jsonb, fts tsvector, UNIQUE(director_id, gmail_message_id)) + indeks `(thread_id, date)` + GIN(fts) + trigger FTS (`simple` config) + RLS own.
- `SELECT schedule_edge_function('gmail_incremental_sync_5min', '*/5 * * * *', '/functions/v1/gmail-incremental-sync', '{}');`
- `SELECT schedule_edge_function('gmail_labels_sync_daily', '0 3 * * *', '/functions/v1/gmail-labels-sync', '{}');`
- ROLLBACK skomentowany.

### B. Edge functions

**`_shared/gmail-parse.ts`** (nowy):
- `parseGmailMessage(raw)` → `{from, to, cc, bcc, subject, date, body_plain, body_html, labels, headers}`. Walk `payload.parts` rekurencyjnie, base64url-decode odpowiednie `mimeType`.

**`gmail-full-sync/index.ts`** (POST):
- Body Zod: `{days_back?: number = 30}`.
- `requireAuth` (director). `getValidAccessToken(directorId)`.
- Pętla: `messages.list?q=newer_than:Nd&pageToken=...` → dla każdego ID: `messages.get?format=full` → parse → UPSERT `gmail_threads` (po `gmail_thread_id`) + UPSERT `gmail_messages`. Match contact_id (SELECT contacts WHERE director_id=X AND (email=ANY OR email_secondary=ANY)) → UPDATE `gmail_threads.contact_id`.
- Po końcu: `users/me/profile` → zapisz `historyId` do `gcal_tokens.gmail_history_id`, `gmail_initial_synced_at=now()`.
- Audit log: `email_full_synced` z liczbą.

**`gmail-incremental-sync/index.ts`** (cron, service-role auth):
- Iteracja `gcal_tokens WHERE gmail_history_id IS NOT NULL`.
- `history.list?startHistoryId=X` (paginate) → dla każdej zmiany: `messageAdded` → fetch+UPSERT, `messageDeleted` → DELETE, `labelAdded/Removed` → UPDATE `labels` na message + `label_ids` na thread.
- Update `gmail_history_id`.
- Per-director rate-limit (catch 429 + log skip).

**`gmail-labels-sync/index.ts`** (cron):
- Dla każdego directora: `users/me/labels` → UPSERT `gmail_labels`.

### C. Sovra
**`sovra/tools.ts`**: nowy tool `search_emails` (read, no confirmation):
- params: `query` (string), `contact_id?` (uuid), `from?` (string), `since_days?` (number, default 30), `limit?` (default 10).
- Handler: SELECT z `gmail_messages` WHERE `director_id=actor` AND `fts @@ plainto_tsquery('simple', query)` AND `date > now() - interval` AND optional joins/filters → top N (id, subject, from, date, snippet=substr(body_plain,0,200), thread_id, contact_id przez join threads).
- Update `human_summary`.

### D. Frontend
**`src/hooks/useGmailThreads.ts`**: list per filter (label/unread/search), paginated; `useGmailThread(threadId)` z messages. Realtime subskrypcja `gmail_messages` (opcjonalnie MVP=pomijam, react-query refetch on focus).
**`src/hooks/useGmailMessages.ts`**: `useGmailMessagesByContact(contactId)` (z `gmail_threads` JOIN messages).
**`src/pages/Inbox.tsx`** (nowa, 3-kolumna shadcn):
- Sidebar: lista `gmail_labels` + filtry (All, Unread, Sent reuse `gmail_outbox`).
- Środek: lista threadów (subject, snippet, last_message_at, badge unread, contact name jeśli linked).
- Prawa: panel wybranego thread (lista messages chronologicznie, body_plain w `<pre>`, fallback body_html sanitized DOMPurify).
- Akcje: „Odpowiedz" → `ComposeEmailModal` z `initialTo=last from`, `initialSubject="Re: ..."`, `inReplyTo=lastMessageId`.
- Search FTS bar (filter forward do hooka, server-side `ilike` lub `fts`).
- Akcje „Mark read"/„Archive" — MVP: tylko mark read (UPDATE local + Gmail API `messages.modify` removeLabelIds=[UNREAD]) — opcjonalne, pomijam jeśli braknie czasu.
**`src/pages/ContactDetail.tsx`**: nowy tab „Emaile" → `useGmailMessagesByContact(contact.id)` → lista threads klikalna do `/inbox?thread=...`.
**`src/App.tsx`**: trasa `/inbox` → lazy Inbox.

### E. Bezpieczeństwo / DOMPurify
- HTML body renderowany z `DOMPurify.sanitize(html, {ALLOWED_TAGS: [...minimal]})`. Nigdy `dangerouslySetInnerHTML` bez sanitizacji.

### F. Kolejność
1. Migracja SQL (3 tabele + ALTER gcal_tokens + 2 cron).
2. `_shared/gmail-parse.ts`.
3. `gmail-full-sync` + `gmail-incremental-sync` + `gmail-labels-sync`.
4. Sovra `search_emails` tool.
5. Hooki + Inbox page + tab w ContactDetail + route.
6. Manualny run `gmail-full-sync` (przez `curl_edge_functions`).
7. Memory update.

### G. DoD
- [ ] 3 tabele + RLS + FTS trigger + 2 cron joby.
- [ ] `gmail-full-sync` pobiera 30 dni.
- [ ] Incremental sync co 5 min via pg_cron.
- [ ] `/inbox` Gmail-like (3 kol).
- [ ] ContactDetail tab Emaile.
- [ ] Sovra `search_emails` zwraca realne wyniki.
- [ ] Match contact_id wypełnione.

### H. Ryzyka
- **R1** Pełen sync 30 dni × wielu maili → timeout edge fn (150s). Mitygacja: full-sync iteruje max ~500 messages per call; jeśli więcej → response `{has_more:true, next_page_token}`, frontend wywołuje ponownie z continuation token. Stan między wywołaniami w `gcal_tokens.gmail_history_id` nie ustawiamy do końca initial sync.
- **R2** Gmail API quota: 250 units/sec/user. `messages.get` = 5 units → ~50/sec. Batch z `Promise.all` po 10. 
- **R3** HTML sanitization edge cases — DOMPurify default config jest OK; obrazy `cid:` tymczasowo bez podglądu.
- **R4** Conflict z istniejącymi tabelami `gmail_*` (per project knowledge wymienione jako planowane) — sprawdzono `types.ts`, na razie nie istnieją. Jeśli pojawią się z innej migracji → CREATE TABLE IF NOT EXISTS chroni przed kolizją; ale schemat może się różnić — zakładam świeży build.
- **R5** Body bardzo dużych maili (>1MB) — TOAST storage Postgres OK, ale FTS może spowolnić. Limit `body_plain` do 1MB (truncate) przy insert.
- **R6** RLS dla service-role w cron — service-role bypasuje RLS, OK.

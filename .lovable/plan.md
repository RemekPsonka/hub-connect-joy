

## Sprint 15 — Gmail wysyłka (zaadaptowany)

### Co już mamy (NIE duplikujemy)
- OAuth Google + szyfrowane refresh_tokens (Sprint 14, `gcal_tokens` + `_shared/gcal.ts`).
- Wzorzec confirmation w `sovra-confirm` (Sprint 5).
- Stuby `draft_email` w `sovra/tools.ts` (gotowe do real-implement).

### Korekty względem MD
1. **Nie tworzę `gmail_integrations`** — rozszerzam istniejący `gcal_tokens` (te same Google credentials, ten sam refresh_token, dodatkowe scopes). Zmiana nazwy logicznej: traktuję `gcal_tokens` jako „google_tokens". Alternatywnie — jeśli Google wyda osobny refresh dla nowych scopes — to i tak zostanie nadpisany przy reconnect. **Decyzja: jeden token, więcej scopes.**
2. **`gmail_outbox`** — tworzę zgodnie z MD (z `actor_id` → `directors.id`, RLS own-only).
3. **OAuth scopes** — dodaję do `gcal-auth/index.ts` SCOPES: `gmail.send`, `gmail.compose`, `gmail.readonly`. User musi reconnect po deploy (tak samo jak po S14).
4. **Gmail send** — używam `getValidAccessToken` z `_shared/gcal.ts` (już działa, zwraca access_token z dowolnymi scopes które user przyznał).
5. **`send_email` tool** — nowy w `sovra/tools.ts` + handler w `sovra-confirm`. `draft_email` przestaje być stub.
6. **Audit log** — INSERT do `audit_log` (entity_type='contact', action='email_sent').
7. **ContactDetailHeader** — dodam przycisk „Wyślij email" (już jest tam toolbar z Edit). Modal compose.

### A. Migracja `<ts>_sprint15_gmail_send.sql`
- `archive.gcal_tokens_scopes_snapshot_20260419` — snapshot scopes.
- CREATE TABLE `public.gmail_outbox` (id, tenant_id, director_id, contact_id?, gmail_message_id?, gmail_draft_id?, to, cc?, bcc?, subject, body_plain, body_html?, status CHECK in (draft|sending|sent|failed), error?, created_at, sent_at?).
- 2 indeksy (director_id+created_at desc, contact_id+created_at desc).
- RLS: own-only via `get_current_director_id()` + `get_current_tenant_id()`.
- ROLLBACK skomentowany.

### B. Edge functions

**Modyfikacja `gcal-auth/index.ts`**:
- SCOPES: dodać `gmail.send`, `gmail.compose`, `gmail.readonly`. Reszta bez zmian (refresh_token storage + scopes column już działa).

**Nowy `_shared/gmail.ts`**:
- `buildRfc2822({from, to, cc?, subject, body, inReplyTo?})` → string.
- `base64UrlEncode(s)` → URL-safe base64 dla Gmail API.

**Nowy `gmail-send/index.ts`**:
- Zod: `{to, subject, body, cc?, bcc?, in_reply_to?, contact_id?}`.
- `requireAuth` (director only).
- `getValidAccessToken(serviceClient, directorId)` → access_token.
- INSERT `gmail_outbox` status='sending'.
- POST `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` z `{raw: base64url(rfc2822)}`.
- UPDATE `gmail_outbox` status='sent', gmail_message_id, sent_at.
- INSERT `audit_log` (entity_type='contact', entity_id=contact_id, action='email_sent', metadata={to,subject}).
- Error path: status='failed', error=message.

**Nowy `gmail-create-draft/index.ts`**:
- Analogicznie, POST do `gmail/v1/users/me/drafts` z `{message:{raw}}`.
- INSERT `gmail_outbox` status='draft', gmail_draft_id.

### C. Sovra integration
**`sovra/tools.ts`**:
- Usunąć `draft_email` ze STUB_TOOLS.
- Dodać tool `send_email` z params: `to, subject, body, contact_id?, cc?`. Marked confirmation-required.
- Update `human_summary` dla obu: pokazuje to/subject/preview body (pierwsze 100 znaków).

**`sovra-confirm/index.ts`** — dodać 2 case'y:
- `case 'draft_email'`: invoke `gmail-create-draft`.
- `case 'send_email'`: invoke `gmail-send`.
- Oba fetch z `service_role` — uwaga: `requireAuth` w gmail-send blokuje service_role bez user kontekstu, więc handler woła bezpośrednio logikę albo invoke z auth headerem usera. **Decyzja:** wyciągnę logikę send do `_shared/gmail.ts` (`sendGmailMessage(serviceClient, directorId, params)`) i wołam ją zarówno z `gmail-send` jak i `sovra-confirm` — bez pętli HTTP.

### D. Frontend

**Nowy `src/components/email/ComposeEmailModal.tsx`**:
- Props: `{open, onClose, initialTo?, initialSubject?, initialBody?, contactId?}`.
- React Hook Form + Zod: to (email), cc?, subject, body (Textarea, future tiptap).
- 2 przyciski: „Zapisz jako szkic" / „Wyślij" → `supabase.functions.invoke('gmail-send'|'gmail-create-draft', {body})`.
- Toast success + invalidate `['gmail-outbox', contactId]`.

**Nowy hook `src/hooks/useGmail.ts`**:
- `useSendEmail()`, `useCreateDraft()`, `useGmailOutbox(contactId)`.

**Modyfikacja `src/components/contacts/ContactDetailHeader.tsx`**:
- Przycisk „Wyślij email" obok „Edit" (Mail icon, disabled jeśli `!contact.email`).
- Otwiera ComposeEmailModal z `initialTo=contact.email, contactId=contact.id`.

**Settings UI** — info „Wymagane uprawnienia: Gmail (wysyłka, szkice, odczyt)". Banner jeśli `scopes` nie zawierają `gmail.send` → „Połącz ponownie".

### E. Kolejność
1. Migracja SQL (gmail_outbox + snapshot).
2. `_shared/gmail.ts` (RFC2822 + sendGmailMessage helper).
3. `gcal-auth` — dodać Gmail scopes.
4. `gmail-send` + `gmail-create-draft`.
5. Sovra: real `send_email`/`draft_email` tools + handlers.
6. Frontend: hook + ComposeEmailModal + przycisk w ContactDetailHeader.
7. Update memory.

### F. DoD
- [ ] `gmail_outbox` z RLS + indeksami.
- [ ] OAuth z Gmail scopes (reconnect required).
- [ ] ContactDetail → „Wyślij email" → mail dociera, outbox status='sent', audit_log wpis.
- [ ] Sovra „Wyślij maila do Jana" → confirmation → realna wysyłka.
- [ ] Szkic zapisuje się w Gmail (widoczny w „Wersje robocze").

### G. Ryzyka
- **R1** Reconnect wymagany — banner w Settings (mam już infrastrukturę z S14).
- **R2** Limit Gmail API: 250 quota units/sec/user, send=100 units → ~2.5 mail/sec. Dla 1 directora wystarczy.
- **R3** RFC2822 quoting (UTF-8 subject, attachments) — w MVP tylko plain text. Załączniki w przyszłości.
- **R4** `actor_id` vs `director_id` — w MD `actor_id`, w istniejących tabelach mix. Sprawdzę i ujednolicę z istniejącą konwencją (`director_id`).
- **R5** Gmail w `audit_log` — sprawdzę czy `audit_log.action` ma whitelistę (CHECK constraint). Jeśli tak — ALTER w migracji.


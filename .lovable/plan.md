
## Plan: Sprint RD-A2 — Edge functions + RPC dla Contact V2

W READ-ONLY mode nie mogę tworzyć plików. Po akceptacji w default mode wykonam recon + utworzę 3 pliki.

### Recon przed kodem (musi przejść)
Twój kod referuje obiekty których nazwy mogę zweryfikować przed zapisem (uniknę crashy):

1. **`_shared/auth.ts`**: nie ma `requireAuth` — jest `verifyAuth(req, supabase)`. Muszę albo dodać alias, albo użyć istniejącego `verifyAuth` (już go widziałem w recon — zwraca `AuthResult | AuthError`).
2. **`_shared/llm-provider.ts`**: muszę sprawdzić czy istnieje i jaki ma kontrakt (`callLLM` może mieć inną sygnaturę niż w Twoim kodzie — `max_tokens` vs `maxTokens`, return shape `.content` vs `.text`).
3. **`_shared/cors.ts`**: sprawdzę czy istnieje plik czy każda funkcja ma własne `corsHeaders` inline.
4. **Kolumny `contacts.tenant_id`**: w jednym z poprzednich planów było „single-tenant", ale FK w `contact_ai_cache` wymaga tego pola. Sprawdzę.
5. **`gmail_messages`**: brak kolumny `contact_id` (potwierdzone w poprzedniej migracji). Sekcja UNION musi pójść przez join `gmail_threads.contact_id` ALBO usunąć całkiem. Sprawdzę schemat.
6. **`gcal_events` / `gcal_event_links`**: sprawdzę czy `gcal_event_links` istnieje. Jeśli nie — usunę sekcję meetings z RPC (zgodnie z Twoją instrukcją „nie może paść").
7. **`ai_messages.scope_type`/`scope_id`**: w poprzedniej migracji okazało się że scope jest w `ai_conversations`, nie w `ai_messages`. Muszę join'ować przez `am.conversation_id`.
8. **`pipeline_stages`**: project knowledge mówi „NIE używaj pipeline_stages — wygaszane". Lepiej join przez `deal_team_stages` albo trzymać samo `status`. Sprawdzę.
9. **`expected_annual_premium_gr`** w `deal_team_contacts`: sprawdzę nazwę pola.

### Wykonanie (po recon)

**Plik 1**: `supabase/functions/sovra/contact-tldr/index.ts`
- Użyję faktycznego API z `_shared/auth.ts` i `_shared/llm-provider.ts` (po recon dostosuję import + sygnaturę).
- Cache check (24h, `invalidated_at IS NULL`) → fetch contact + deals → LLM call → upsert do `contact_ai_cache`.
- Jeśli `pipeline_stages` jest wygaszone, zamienię join na `deal_team_stages` lub samo `stage_id`.

**Plik 2**: `supabase/functions/sovra/contact-activity-timeline/index.ts`
- Cienki wrapper na RPC `rpc_contact_timeline`. Bez logiki — RPC robi UNION.

**Plik 3**: `supabase/migrations/20260420100100_rpc_contact_timeline.sql`
- RPC `rpc_contact_timeline(contact_id, filter, limit, before)` zwracające unified timeline.
- Sekcje UNION: `note` (zawsze, mamy `contact_notes`), `ai_signal` (z join przez `ai_conversations` na scope), `email` (przez join `gmail_threads.contact_id` LUB skip jeśli nie ma związku), `meeting` (przez `gcal_event_links` LUB skip).
- `SECURITY INVOKER` + `search_path` + `GRANT EXECUTE TO authenticated` + komentarz `-- ROLLBACK: DROP FUNCTION ...`.
- **Twarda zasada**: każda sekcja UNION którą recon zweryfikuje jako rozjazd → wyrzucam całkowicie, żeby migracja przeszła.

**config.toml**: edge functions w sub-folderze `sovra/contact-tldr` / `sovra/contact-activity-timeline` — muszę sprawdzić czy `config.toml` wspiera nested ścieżki funkcji w tym projekcie. Standardowo Supabase CLI bierze nazwę z folderu top-level. Może trzeba spłaszczyć do `sovra-contact-tldr` i `sovra-contact-activity-timeline`. Sprawdzę istniejące funkcje w `supabase/functions/`.

**Po wszystkim**: deploy obu funkcji + wypiszę `[OK] Edge fn + RPC timeline gotowe`.

### Konflikt z project-knowledge
Project knowledge mówi: *„nie buduj feature flag systemu — skala 1-2 tenantów nie uzasadnia"*. Poprzednia migracja dodała `feature_flags` do `directors`. Idziemy dalej zgodnie z Twoim kierunkiem (sprint Contact V2 wymaga flagi do gradual rollout). Zaznaczam tylko, nie blokuję.

Project knowledge mówi też: *„NIE używaj `pipeline_stages` — wygaszane"*. Twój TL;DR kod join'uje `pipeline_stages(name)`. Zamienię na `deal_team_stages` (lub samo `status`/`stage_id` jako fallback) po recon.

### Pliki
- `supabase/functions/sovra-contact-tldr/index.ts` lub `sovra/contact-tldr/index.ts` (decyzja po recon config.toml)
- `supabase/functions/sovra-contact-activity-timeline/index.ts` (analogicznie)
- `supabase/migrations/20260420100100_rpc_contact_timeline.sql` (z rollback)

### Bez zmian FE w tym kroku.

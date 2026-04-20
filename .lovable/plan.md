
## Plan: Sprint RD-A1 — Contact V2 (feature flag + notes + AI cache)

W READ-ONLY mode nie mogę utworzyć pliku migracji. Po Twojej akceptacji w default mode wykonam recon + utworzę migrację.

### Recon przed migracją (musi przejść)
Twój SQL używa kilku obiektów których muszę zweryfikować że istnieją z tymi nazwami:
1. `public.tenants(id)` — sprawdzę czy tabela się tak nazywa (możliwe że to `directors` jako tenant proxy w single-tenant setup).
2. `public.get_current_tenant_id()` — funkcja musi istnieć (RLS innych tabel powinno to ujawnić).
3. `public.get_current_director_id()` — j.w.
4. `directors.email` + rekord `remek@ideecom.pl` — sprawdzę.
5. `ai_messages.scope_type`/`scope_id` — sprawdzę kolumny.
6. `gmail_messages` ma kolumnę `contact_id`? (z pamięci: tabela istnieje, ale link do kontaktu może być przez `gmail_threads`). Jeśli nie ma — trigger `trg_inv_cache_on_email` użyje `NEW.contact_id` które będzie NULL → no-op (bezpieczne, ale warto wiedzieć).
7. `gcal_events.contact_id` — analogicznie.

Jeśli któryś obiekt ma inną nazwę → dostosuję SQL przed zapisem migracji (np. `tenants` → `directors`, helper funkcje → faktyczne nazwy z bazy). Bez wymyślania — sprawdzę read query.

### Wykonanie (po recon)
1. Utworzę plik `supabase/migrations/20260420100000_sprint_rd_a1_contact_v2.sql` z Twoim SQL (z poprawkami nazw jeśli recon wykryje rozjazdy).
2. Migracja zawiera: `feature_flags` jsonb na `directors` + flaga dla Remka, tabela `contact_notes` z RLS, tabela `contact_ai_cache` z RLS i unique per contact, funkcja `invalidate_contact_ai_cache`, dwa trigger helpers (`trg_inv_cache_direct`, `trg_inv_cache_from_ai`), 4 triggery invalidujące cache (notes/gmail/gcal/ai).
3. Uruchomię migrację przez tool migracji (auto-approval).
4. Wypiszę: `[OK] Migracja 20260420100000 przeszła. flag+notes+cache+triggery`.

### Brak ROLLBACK w pliku
Twój SQL nie zawiera komentarza `-- ROLLBACK:`. Project knowledge wymaga rollback w każdej migracji. Dorzucę go na końcu pliku jako komentarz (DROP triggers/functions/tables/column/index — w odwrotnej kolejności). Bez wpływu na exec.

### Ryzyka
- Jeśli `tenants` nie istnieje jako tabela — RLS się wywali na FK. Recon to wykryje.
- Triggery na `gmail_messages`/`gcal_events` — jeśli te tabele nie mają `contact_id`, trigger będzie no-op (NEW.contact_id IS NULL → return). Bezpieczne, ale warto rozważyć join przez `gmail_threads` w osobnym sprincie.

### Pliki
- `supabase/migrations/20260420100000_sprint_rd_a1_contact_v2.sql` (nowy)

### Bez zmian FE w tym kroku. Tylko DB.

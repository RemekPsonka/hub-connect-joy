
User pyta czy da się uruchomić pg_cron i czy zastosować jako domyślny scheduler. To zmiana decyzji ze Sprint 10 (gdzie pg_cron był odrzucony).

## Odpowiedź

**Tak, pg_cron działa na Supabase** — to standardowe rozszerzenie Postgresa dostępne w każdym projekcie Supabase (również w Lovable Cloud). Razem z `pg_net` pozwala wywoływać edge functions na harmonogramie bez zewnętrznego schedulera.

## Co zrobię po akceptacji

### 1. Włączenie rozszerzeń (migracja SQL)
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Helper SQL `schedule_edge_function(name, cron_expr, function_path, body)` 
Jedna funkcja owijająca `cron.schedule` + `net.http_post` z poprawnym auth headerem (service role key z Vault). Dzięki temu kolejne joby = jedna linia, bez powielania URL/klucza.

### 3. Vault — przechowanie service role key
Service role key w `vault.secrets` (zamiast hardkodowania w każdym jobie). Helper czyta przez `vault.decrypted_secrets`.

### 4. Migracja istniejących cronów na nowy wzorzec
Aktualnie mamy edge functions oznaczone w `config.toml` jako cron-callable (`background-sync-runner`, `sovra-reminder-trigger`, `sovra-weekly-report`). Sprawdzę czy mają już zaplanowane joby — jeśli nie, zaplanuję:
- `background-sync-runner` — co 5 min
- `sovra-reminder-trigger` — codziennie 7:00 (Europe/Warsaw → 6:00 UTC)
- `sovra-weekly-report` — poniedziałki 8:00 (7:00 UTC)

### 5. Sprint 12 — re-enable lazy + cron
W Sprint 12 zrobiłem AIRecsWidget z lazy generate on-read. Teraz dodaję także cron `sovra-generate-daily-recs` codziennie 6:00 UTC, żeby user widział recs od razu po otwarciu. Lazy zostaje jako fallback (gdy cron padnie).

### 6. Aktualizacja project knowledge
Update memory: `mem://technical/scheduling-pg-cron` — pg_cron + pg_net są domyślnym schedulerem, helper `schedule_edge_function`, Vault dla service key. Wcześniejsza decyzja "no pg_cron" ze Sprint 10 — odwołana.

### 7. Monitoring
- Widok `cron_job_health` (SECURITY DEFINER, admin-only) z `cron.job_run_details` — ostatnie 100 uruchomień + status. Do wykorzystania w przyszłym admin panelu.

## Co NIE robię
- Nie ruszam crona aplikacyjnego dla rzeczy real-time (np. notyfikacje natychmiastowe → realtime/triggery, nie cron).
- Nie planuję jobów częstszych niż co 1 min (limit pg_cron).
- Service role key idzie do Vault — **nie** do `config.toml` ani do kodu klienta.

## Ryzyka
- **R1:** Jeśli `vault` extension nie jest dostępne → fallback: secret w jednorazowej tabeli `private.scheduler_secrets` z RLS „deny all" + dostęp tylko przez SECURITY DEFINER funkcję.
- **R2:** Cron joby mogą się duplikować przy re-deployu migracji. Mitygacja: helper sprawdza `cron.job` po nazwie i robi `cron.unschedule` przed `cron.schedule` (idempotent).
- **R3:** Service role wywoływany z DB ma pełen dostęp — każda cron-callable funkcja MUSI walidować że to wywołanie z cron (porównanie tokena z `SUPABASE_SERVICE_ROLE_KEY`), co już robi `sovra-reminder-trigger` (Path A).

## DoD
- [ ] `pg_cron` + `pg_net` enabled.
- [ ] Helper `schedule_edge_function` działa.
- [ ] 3 istniejące cron-callable funkcje mają zaplanowane joby.
- [ ] `sovra-generate-daily-recs` ma cron 6:00 UTC.
- [ ] Memory update — pg_cron jako default.

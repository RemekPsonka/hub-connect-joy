

# Plan: Włączenie JWT Verification dla Edge Functions

## Cel

Zmiana `verify_jwt = false` na `verify_jwt = true` dla wszystkich 47 Edge Functions w `supabase/config.toml`, co doda warstwę bezpieczeństwa na poziomie Supabase API Gateway.

---

## Obecny stan (KRYTYCZNA LUKA)

```toml
# Każda z 47 funkcji ma:
[functions.nazwa-funkcji]
verify_jwt = false
```

**Problem:** Supabase Gateway NIE weryfikuje tokenów JWT przed wywołaniem funkcji. Każdy z dostępem do URL może wywołać funkcję.

---

## Docelowy stan (DEFENSE IN DEPTH)

```toml
# Każda z 47 funkcji będzie miała:
[functions.nazwa-funkcji]
verify_jwt = true
```

**Efekt:** Dwuwarstwowa weryfikacja:
1. **Warstwa 1 (Gateway):** Supabase odrzuca request bez ważnego JWT PRZED wywołaniem funkcji
2. **Warstwa 2 (Kod):** `verifyAuth()` w funkcji dodatkowo sprawdza token i tenant_id

---

## Zmiany w pliku

**Plik:** `supabase/config.toml`

**Operacja:** Zamiana wszystkich `verify_jwt = false` na `verify_jwt = true`

**Dotyczy funkcji (47 sztuk):**
- generate-embedding
- ai-chat
- ai-chat-router
- find-matches
- generate-meeting-recommendations
- ai-recommendations
- generate-daily-serendipity
- generate-analytics-insights
- ocr-business-card
- ocr-business-cards-batch
- enrich-company-data
- enrich-person-data
- generate-contact-profile
- initialize-contact-agent
- query-contact-agent
- master-agent-query
- agent-action
- turbo-agent-query
- bi-agent-interview
- create-tenant-user
- update-tenant-user
- create-assistant
- check-duplicate-contact
- merge-contacts
- parse-contacts-list
- create-new-tenant
- delete-tenant
- analyze-linkedin-profile
- parse-linkedin-network
- scrape-company-logo
- update-company-revenue
- sync-contact-agents
- verify-company-source
- scan-company-website
- analyze-company-external
- fetch-company-financials
- synthesize-company-profile
- batch-krs-sync
- create-companies-from-emails
- background-sync-runner
- create-representative
- process-bi-ai
- analyze-insurance-risk
- remek-chat

---

## Co NIE zostanie zmienione

| Element | Status |
|---------|--------|
| `verifyAuth()` w kodzie funkcji | Pozostaje (defense in depth) |
| `project_id` w config.toml | Bez zmian |
| Sekcje `[auth]`, `[api]`, `[db]` | Nie dotyczy (nie istnieją) |
| Inne ustawienia funkcji (np. `import_map`) | Bez zmian |

---

## Wpływ na działanie systemu

| Przed | Po |
|-------|-----|
| Każdy może wywołać funkcję bez tokenu | Wymagany ważny JWT token |
| Błędy autoryzacji wykrywane w kodzie | Błędy wykrywane PRZED wykonaniem kodu |
| Jedna warstwa ochrony | Dwie warstwy ochrony |

---

## Wymagania

- Wszystkie wywołania Edge Functions muszą zawierać nagłówek `Authorization: Bearer <token>`
- Supabase client automatycznie dodaje ten nagłówek gdy użytkownik jest zalogowany
- Niezalogowani użytkownicy nie będą mogli wywoływać żadnych funkcji (zgodnie z oczekiwaniami)


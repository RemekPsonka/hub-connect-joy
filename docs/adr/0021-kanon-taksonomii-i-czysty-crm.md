# ADR 0021 — Kanon taksonomii i „Czysty CRM"

Data: 2026-07-02
Status: Zaakceptowane (decyzje Remka, sesja porządkowa 2026-07-02)

## Kontekst

Audyt spójności kod↔baza z 2026-07-02 pokazał kilka niezależnych rozjazdów, które kumulowały się od Sprintów 16-19 (SGU-REFACTOR-IA, BLOK 2/3 milestones, Odprawa AI, background jobs):

1. **Kolumna `deal_team_contacts.category`** pełniła równocześnie 4 role: „etap lejka" (prospect/lead/offering/audit/client), „temperaturę" (hot/top/cold/10x), „przegraną" (lost) i „stan operacyjny" (converting/nurture). Zapisy szły z co najmniej 6 miejsc w kodzie z różnymi rozumieniami — w konsekwencji ta sama karta potrafiła jednocześnie być „client" w widoku klientów i „lost" w Odprawie.
2. **Dwie kolumny wartości** — `estimated_value` (numeric PLN, ręcznie w PromoteDialog) i `expected_annual_premium_gr` (bigint w groszach, ustawiane przez `convert_to_client`). Kanban i dashboardy czytały raz jedno, raz drugie. Sumy się nie zgadzały.
3. **Silnik `relationship_health`** — tabela + trigger + widok liczące „siłę relacji" na podstawie meta-cech (liczba spotkań, dni od ostatniego kontaktu). Audyt: 2524/2524 kontaktów miało `strength = 5` (pseudo-dane; algorytm degenerował się dla braku historii). Front konsumował to w 6 miejscach jako sygnał priorytetu — de facto szum.
4. **49 kolumn w `deal_team_contacts`** — 8 z nich martwych: `deprecated_deal_stage_20260623`, `deprecated_representative_user_id_20260623`, `deprecated_estimated_value_20260702`, `deprecated_value_currency_20260702`, `priority`, `review_frequency`, `status_overdue`, `deal_id`.
5. **Funkcje odwołujące się do nieistniejących kolumn** — `require_director_on_dtc_task` czytała `c.company_name` (nie istnieje; jest `c.company`); `rpc_sgu_accept_prospecting_candidate` insertowała `created_by_user_id` (nie istnieje; `director_id` ustawia trigger).
6. **Brak partycji `audit_log_2027_*`** — ryzyko utraty wpisów po 2026-12-31. Kilka partycji `ai_usage_log_2026_*` bez REVOKE dla `anon/authenticated`.

## Decyzja

### a) Kanon taksonomii

`deal_team_contacts.category` przyjmuje **wyłącznie 3 wartości**, wymuszone `CHECK`:

```sql
CHECK (category IN ('prospect','lead','client'))
```

Pozostałe wymiary żyją w osobnych kolumnach — jedna kolumna = jedna odpowiedzialność:

- **Etap lejka:** `offering_stage` (8 wartości: decision_meeting, handshake, power_of_attorney, audit, offer_sent, negotiation, won, lost) + timestampy milestones K1-K4 (`k1_meeting_done_at`, `handshake_at`, `poa_signed_at`, `audit_done_at`, `won_at`).
- **Temperatura (w tym 10x):** `temperature ∈ {hot, top, cold, 10x}`. „10x" NIE jest kategorią.
- **Przegrana:** wyłącznie `is_lost` + `lost_reason` + `lost_at`. Widoki filtrują po `COALESCE(is_lost, false) = false`. Kategoria zostaje bez zmian (można stracić prospekta, leada i klienta — każde z osobna).

### b) Jedno pole wartości

Kwoty żyją w **`expected_annual_premium_gr`** (bigint, grosze, spójne z całą aplikacją per konwencja „kwoty w groszach"). `estimated_value` i `value_currency` skasowane. `convert_to_client` sumuje 4 pola `potential_*_gr` do `expected_annual_premium_gr`. Front prezentuje przez `expected_annual_premium_gr / 100`.

### c) Wycięty silnik relationship_health

Usunięte: tabela `relationship_health`, funkcje `calculate_relationship_health`, `trigger_update_relationship_health`, trigger `recalc_health_on_contact_update`, kolumny `healthy_contacts` w dashboard stats, komponenty `RelationshipStrengthBar`, `RelationshipAlerts`, `ContactsToRenew`, hook `useRelationshipHealth`. Powód: pseudo-dane (strength=5 u 2524/2524 kontaktów) — sygnał był nieodróżnialny od szumu.

### d) `deal_team_contacts` 49 → 41 kolumn

Skasowane 8 kolumn: `deprecated_deal_stage_20260623`, `deprecated_representative_user_id_20260623`, `deprecated_estimated_value_20260702`, `deprecated_value_currency_20260702`, `priority`, `review_frequency`, `status_overdue`, `deal_id`, plus `estimated_value` i `value_currency` (część kolumn była już wyrenamowana — DROP IF EXISTS załatwia oba przypadki).

### e) Konsekwencje dla kodu

- `DealCategory = 'prospect' | 'lead' | 'client'` (3 wartości, ścisłe).
- `LegacyDealCategory = DealCategory | 'hot' | 'top' | 'cold' | '10x' | 'offering' | 'audit' | 'lost'` — typ szeroki po stronie odczytu dla komponentów legacy (`KanbanBoard`, `PromoteDialog`, `TableView`, `SalesFunnelDashboard`, `NextActionDialog`, `ContactActionButtons`, `RestoreToFunnelDialog`, `OfferingKanbanBoard`). DB `CHECK` blokuje zapisy legacy wartości — nowe kategorie zawsze z `DealCategory`.
- Statystyki lejka i Odprawy liczą po `temperature` i `is_lost`, nie po `category`.
- `useStalledContacts` i `usePriorityStuckNegotiation` filtrują `category IN ('prospect','lead')`.

## Konsekwencje

**Pozytywne**

- Jedno pole = jedna odpowiedzialność. Konflikty typu „client + lost" niemożliwe (CHECK + osobne kolumny).
- Sumy wartości w Kanbanie i dashboardach spójne (jedno źródło: `expected_annual_premium_gr`).
- Dashboard stats liczy tylko realne sygnały (bez pseudo-„healthy_contacts").
- `deal_team_contacts` prostsza (41 kolumn, mniej martwych ścieżek dla mutacji).
- Nowe zapisy `create/update` na `contacts` z SGU prospectingu nie padają na nieistniejącej kolumnie `created_by_user_id`.

**Negatywne / dług**

- `LegacyDealCategory` żyje dalej po stronie read w kilku komponentach — usunięcie w Sprint 20+ przy refaktorze /deals-team.
- Historyczne dane sprzed 07-02 z kategoriami `offering`/`audit`/`lost` są zmigrowane (`offering+new → prospect+active`, klient → `status='won'`) — komponenty legacy pokazują je w kolumnach z fallbackiem przez `offering_stage`+milestones.
- Wycięcie silnika `relationship_health` = brak jakiegokolwiek sygnału „siła relacji" do czasu odbudowy na realnych danych (Gmail volume, GCal meetings, tasks completed) — planowane w Sprint 21+.

## Realizacja

Zmiany fizyczne w bazie wykonano 2026-07-02 przez connector (as-built). Zapis w repo:
`supabase/migrations/20260702180000_konsolidacja_audyt_kanon_czysty_crm_20260702.sql` — plik w 100% idempotentny (DROP IF EXISTS, CREATE OR REPLACE, DO-bloki z sprawdzeniem `pg_constraint`), służy odtwarzalności środowiska od zera.

Zmiany po stronie kodu (typy, hooki, komponenty) omówione w pojedynczych commitach z 2026-07-02: „KANON TAKSONOMII", „CZYSTY CRM", „AUDYT SPÓJNOŚCI".
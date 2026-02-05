# Plan: Podpięcie frontendu pod get_dashboard_stats() RPC

## Status: ✅ ZREALIZOWANY

---

## Wykonane zmiany

### 1. Dashboard.tsx ✅
- Zamieniono 4 osobne zapytania COUNT na jedno wywołanie `supabase.rpc('get_dashboard_stats')`
- Mapowanie: `total_contacts` → `stats.contacts`, `today_consultations` → `stats.todayMeetings`, etc.

### 2. useAnalytics.ts ✅
- Zredukowano zapytania z 9 do 6 (usunięto: `prevContactsResult`, `offersResult`, `contactsWithGroupsResult`, `groupsResult`)
- Podstawowe metryki pobierane z RPC: `total_contacts`, `new_contacts_30d`, `contacts_prev_30d`, `active_needs`, `active_offers`
- Network health pobierany z RPC: `healthy_contacts`, `warning_contacts`, `critical_contacts`
- Zachowano szczegółowe zapytania dla timeline/charts (dane nie są w MV)

---

## Korzyści

| Metryka | Przed | Po |
|---------|-------|-----|
| Zapytania w Dashboard.tsx | 4 | 1 |
| Zapytania w useAnalytics.ts | 9 | 6 |
| Round-trips do bazy | 13 | 7 |

---

## Baza danych (bez zmian)

- `mv_dashboard_stats` - materialized view z 13 kolumnami
- `get_dashboard_stats()` - funkcja RPC (SECURITY DEFINER, używa `get_current_tenant_id()`)
- Triggery automatyczne na 5 tabelach (contacts, tasks, consultations, needs, matches)


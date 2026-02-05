

# Plan: Podpięcie frontendu pod get_dashboard_stats() RPC

## Cel

Zamiana wielu równoległych zapytań SQL na jedno wywołanie funkcji RPC `get_dashboard_stats()`, która pobiera dane z materialized view.

---

## Obecny stan

### Baza danych ✅
- `mv_dashboard_stats` - działa (13 kolumn, dane się odświeżają)
- `get_dashboard_stats()` - funkcja RPC gotowa (bez parametru, używa `get_current_tenant_id()`)
- Triggery automatyczne - aktywne na 5 tabelach

### Frontend ❌
| Plik | Problem |
|------|---------|
| `Dashboard.tsx` | 4 osobne zapytania COUNT (linie 50-72) |
| `useAnalytics.ts` | 9 równoległych zapytań (linie 139-192) |

---

## Zmiany do wprowadzenia

### 1. Dashboard.tsx - zamiana 4 zapytań na 1 RPC

**Przed (4 zapytania):**
```typescript
const { count: contactsCount } = await supabase
  .from('contacts')
  .select('*', { count: 'exact', head: true });

const { count: meetingsCount } = await supabase
  .from('consultations')
  .select('*', { count: 'exact', head: true })
  .gte('scheduled_at', `${today}T00:00:00`)
  .lt('scheduled_at', `${today}T23:59:59`);

// ... itd.
```

**Po (1 RPC):**
```typescript
const { data: dashboardStats, error } = await supabase
  .rpc('get_dashboard_stats');

if (dashboardStats && dashboardStats.length > 0) {
  const stats = dashboardStats[0];
  setStats({
    contacts: Number(stats.total_contacts) || 0,
    todayMeetings: Number(stats.today_consultations) || 0,
    pendingTasks: Number(stats.pending_tasks) || 0,
    activeNeeds: Number(stats.active_needs) || 0,
  });
}
```

### 2. useAnalytics.ts - wykorzystanie danych z RPC

Hook `useAnalytics` nadal potrzebuje szczegółowych danych do wykresów (timeline, industry breakdown), więc zachowamy równoległe zapytania dla danych szczegółowych, ale metryki podstawowe można pobrać z RPC.

**Zmiany:**
- Dodać wywołanie `get_dashboard_stats()` dla podstawowych metryk
- Zachować szczegółowe zapytania dla timeline/charts (te dane nie są w MV)
- Zmniejszyć liczbę zapytań z 9 do ~5

---

## Mapowanie kolumn MV → frontend

| Kolumna MV | Dashboard.tsx | useAnalytics.ts |
|------------|---------------|-----------------|
| `total_contacts` | `stats.contacts` | `metrics.totalContacts` |
| `new_contacts_30d` | - | `contactsGrowth` calculation |
| `contacts_prev_30d` | - | `contactsGrowth` calculation |
| `today_consultations` | `stats.todayMeetings` | - |
| `pending_tasks` | `stats.pendingTasks` | - |
| `active_needs` | `stats.activeNeeds` | `metrics.activeNeeds` |
| `active_offers` | - | `metrics.activeOffers` |
| `pending_matches` | - | - |
| `upcoming_meetings` | - | `metrics.totalMeetings` (partial) |
| `healthy_contacts` | - | `networkHealth.healthy` |
| `warning_contacts` | - | `networkHealth.warning` |
| `critical_contacts` | - | `networkHealth.critical` |
| `refreshed_at` | - | cache info |

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/pages/Dashboard.tsx` | Zamiana 4 zapytań na `supabase.rpc('get_dashboard_stats')` |
| `src/hooks/useAnalytics.ts` | Częściowe wykorzystanie RPC + zachowanie zapytań szczegółowych |

---

## Korzyści

| Metryka | Przed | Po |
|---------|-------|-----|
| Zapytania w Dashboard.tsx | 4 | 1 |
| Zapytania w useAnalytics.ts | 9 | ~5 |
| Round-trips do bazy | 13 | 6 |
| Czas odpowiedzi | ~200-400ms | ~50-100ms |

---

## Bez zmian

- Struktura bazy danych
- Edge Functions
- Pozostałe komponenty dashboard (widgety)
- Triggery automatycznego refresha


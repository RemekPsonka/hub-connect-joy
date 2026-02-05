
# Plan: Dodanie globalnego staleTime do React Query

## Cel
Zredukować liczbę niepotrzebnych refetchy przez skonfigurowanie globalnych ustawień cache dla React Query.

---

## Zmiana: src/App.tsx

**Plik:** `src/App.tsx` (linia 54)

**PRZED:**
```typescript
const queryClient = new QueryClient();
```

**PO:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minut - dane CRM nie zmieniają się co sekundę
      gcTime: 10 * 60 * 1000,   // 10 minut w cache przed garbage collection
      retry: 1,                  // 1 retry przy błędzie (nie bombardujemy API)
      refetchOnWindowFocus: false, // brak refetch przy powrocie do karty
    },
  },
});
```

---

## Uzasadnienie wartości

| Parametr | Wartość | Powód |
|----------|---------|-------|
| `staleTime` | 5 min | Dane CRM (kontakty, firmy, statystyki) nie zmieniają się co sekundę |
| `gcTime` | 10 min | Cache trzymany dłużej - przy powrocie dane natychmiast dostępne |
| `retry` | 1 | Jeden retry wystarczy, nie bombardujemy API przy stałym błędzie |
| `refetchOnWindowFocus` | false | User nie chce refetch za każdym razem jak wraca do karty |

---

## Hooki z własnymi ustawieniami (BEZ ZMIAN)

Hooki które celowo nadpisują globalne ustawienia pozostają bez zmian - ich nadpisania są prawidłowe.

---

## Efekt

- Dashboard nie będzie robił wielokrotnych requestów przy każdym renderze
- Dane będą "świeże" przez 5 minut
- Poszczególne hooki mogą nadal nadpisywać te ustawienia gdy potrzebują

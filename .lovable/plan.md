
# Prowizja w % dla klientow

## Problem

W panelu klienta pole "Prowizja" jest traktowane jako kwota w PLN. Uzytkownik wpisuje np. `8` oczekujac 8%, ale system zapisuje to jako 8 PLN.

## Rozwiazanie

Zmiana w `ClientProductsPanel.tsx`:

1. **Zmiana etykiety** pola z "Prowizja (PLN)" na "Prowizja (%)" dla kategorii `client`
2. **Zmiana logiki obliczen** przy dodawaniu produktu:
   - Dla klientow: uzytkownik podaje procent, system oblicza kwote: `expectedCommission = dealValue * (commissionPercent / 100)`
   - Dla pozostalych kategorii (hot/top/lead/cold): bez zmian -- prowizja podawana w PLN
3. **Walidacja zakresu** -- dla klientow ograniczenie do 0-100%

### Zmiana w kodzie (`ClientProductsPanel.tsx`)

Funkcja `handleAdd`:

```text
// Dla klientow:
commissionPercent = parseFloat(commission)        // np. 8
expectedCommission = val * (commissionPercent / 100) // np. 6000000 * 0.08 = 480000

// Dla pozostalych (bez zmian):
expectedCommission = parseFloat(commission)        // kwota PLN
commissionPercent = val > 0 ? (com / val) * 100 : 0
```

Etykieta pola:

```text
category === 'client' ? "Prowizja (%)" : "Prowizja (PLN)"
```

Placeholder pola:

```text
category === 'client' ? "np. 8" : "0"
```

## Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/ClientProductsPanel.tsx` | Logika obliczen prowizji, etykieta pola |

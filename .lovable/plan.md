
# Rozbudowa listy Prospecting -- filtry, konwersja z merge, usuwanie

## Zakres zmian

### 1. Filtr wg zrodla (source_event) w `ProspectingList.tsx`
- Dodanie drugiego selecta obok filtra statusu: "Zrodlo" z unikalnymi wartosciami `source_event` z danych
- Opcja "Wszystkie zrodla" jako domyslna
- Filtrowanie lokalne (dane juz sa pobrane)

### 2. Rozbudowa konwersji z wykrywaniem duplikatow w `ProspectingConvertDialog.tsx`
- Przy otwarciu dialogu wyszukiwanie w tabeli `contacts` po `full_name` (ilike) i opcjonalnie `company`
- Jesli znaleziono potencjalny duplikat -- wyswietlenie opcji:
  - "Scal z istniejacym kontaktem" (uzywa ID istniejacego kontaktu, aktualizuje brakujace pola)
  - "Utworz nowy kontakt" (obecna logika)
- Przy scalaniu: aktualizacja kontaktu o brakujace dane (email, phone, linkedin) + dodanie do `deal_team_contacts` + oznaczenie prospekta jako skonwertowanego

### 3. Opcja usuwania -- juz istnieje
- Usuwanie jest juz zaimplementowane w menu kontekstowym (ikona Trash2). Bez zmian.

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/ProspectingList.tsx` | Dodanie filtra zrodla (source_event) |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Wyszukiwanie duplikatow w contacts, opcja scalania |

## Szczegoly techniczne

### ProspectingList.tsx
- Nowy state: `sourceFilter` (string, default `'all'`)
- Obliczenie unikalnych zrodel: `Array.from(new Set(prospects.map(p => p.source_event).filter(Boolean)))`
- Drugi `Select` obok istniejacego filtra statusu
- Filtrowanie: `filtered = prospects.filter(p => (statusFilter === 'all' || ...) && (sourceFilter === 'all' || p.source_event === sourceFilter))`

### ProspectingConvertDialog.tsx
- `useEffect` przy otwarciu -- query do `contacts` z `ilike('full_name', '%name%')` + opcjonalnie `eq('company', company)`
- Wyswietlenie listy znalezionych duplikatow z przyciskiem "Scal"
- Tryb "merge": zamiast `insert` do contacts, robi `update` istniejacego kontaktu (uzupelnia puste pola) i uzywa jego ID do `deal_team_contacts`
- Sprawdzenie czy kontakt nie jest juz w zespole (query `deal_team_contacts` po `contact_id` + `team_id`)

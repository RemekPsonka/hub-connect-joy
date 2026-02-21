
# Dodanie polskiego kalendarza (od poniedziałku)

Zmiana dotyczy komponentu `Calendar` (`src/components/ui/calendar.tsx`) — wystarczy dodać domyślne ustawienie `locale` na `pl` i `weekStartsOn: 1`. Dzięki temu WSZYSTKIE kalendarze w aplikacji (SnoozeDialog, datepickery, itp.) automatycznie zaczną tydzień od poniedziałku z polskimi nazwami dni.

## Szczegóły techniczne

**Plik:** `src/components/ui/calendar.tsx`

Zmiany:
- Import `pl` z `date-fns/locale`
- Dodanie domyślnych props: `locale={pl}` i `weekStartsOn={1}` (poniedziałek) do komponentu `DayPicker`
- Istniejące props z zewnątrz nadal mogą nadpisać te wartości (spread `...props` na końcu)

To jedna mała zmiana w jednym pliku, która naprawi wszystkie kalendarze w całej aplikacji.

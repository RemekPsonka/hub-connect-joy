

# Naprawa widocznosci filtra "Zrodlo"

## Problem
Filtr zrodla (`source_event`) jest ukryty warunkiem `uniqueSources.length > 1` -- wyswietla sie tylko gdy sa co najmniej 2 rozne zrodla. Jesli wszystkie prospekty pochodza z jednego wydarzenia (lub zadne nie ma ustawionego zrodla), filtr jest niewidoczny.

## Rozwiazanie
Zmiana warunku z `uniqueSources.length > 1` na `uniqueSources.length > 0` -- filtr pojawi sie zawsze gdy istnieje chociaz jedno zrodlo.

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/ProspectingList.tsx` linia 165 | Zmiana warunku `uniqueSources.length > 1` na `uniqueSources.length > 0` |

Jedna linijka do zmiany.

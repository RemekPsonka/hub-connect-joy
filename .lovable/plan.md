
# Znaczniki priorytetu na liscie Prospecting

## Opis
Dodanie kolorowych znacznikow priorytetu (czerwony/zolty/zielony) do kazdego prospekta na liscie. Znaczniki beda klikalne -- jedno klikniecie zmienia priorytet cyklicznie (brak -> zielony -> zolty -> czerwony -> brak). Dane zapisywane w bazie w nowej kolumnie `priority`.

## Zmiany

### 1. Migracja SQL
Dodanie kolumny `priority` do tabeli `meeting_prospects`:
```sql
ALTER TABLE public.meeting_prospects
  ADD COLUMN priority TEXT DEFAULT NULL;
```
Wartosci: `'high'` (czerwony), `'medium'` (zolty), `'low'` (zielony), `NULL` (brak znacznika).

### 2. Hook `useMeetingProspects.ts`
- Dodanie `priority` do typu `MeetingProspect`
- Dodanie `priority` do dozwolonych pol w `useUpdateMeetingProspect`

### 3. Komponent `ProspectingList.tsx`
- Kolorowe kolko obok imienia prospekta -- klikalne, zmienia priorytet cyklicznie (brak -> high -> medium -> low -> brak)
- Czerwone kolko = wazne, zolte = srednie, zielone = najmniej wazne
- Dodanie filtra priorytetu obok istniejacych filtrow
- W menu kontekstowym: sekcja "Priorytet" z opcjami ustawienia

### 4. Sortowanie
Lista domyslnie sortowana: najpierw czerwone (high), potem zolte (medium), zielone (low), na koncu bez znacznika.

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa kolumna `priority` |
| `src/hooks/useMeetingProspects.ts` | Typ + pole w mutacji update |
| `src/components/deals-team/ProspectingList.tsx` | UI znacznikow, filtr, sortowanie |



# Naprawienie sekcji Kategoria w DealContactDetailSheet

## Problem
Sekcja "KATEGORIA" w oknie szczegolowego kontaktu ma 8 przyciskow (`flex-1`) w ograniczonej szerokosci dialogu `max-w-2xl`. Przyciski sie zgniataja i ostatni ("PRZEGRANE") jest ucinany.

## Rozwiazanie

### Plik: `src/components/deals-team/DealContactDetailSheet.tsx`

Zmiana kontenera przyciskow kategorii z:
```
<div className="flex gap-1.5">
  <Button className="flex-1 text-xs h-8" ...>
```
na kontener z przewijaniem poziomym:
```
<div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
  <Button className="shrink-0 text-xs h-8 px-3" ...>
```

Kluczowe zmiany:
- `overflow-x-auto` na kontenerze - umozliwia przewijanie gdy przyciski nie mieszcza sie
- `pb-1` - odrobine miejsca na scrollbar
- Zamiana `flex-1` na `shrink-0` na przyciskach - kazdy przycisk zachowuje naturalna szerokosc i nie jest zgniatany
- Dodanie `px-3` dla minimalnego paddingu

Dzieki temu przyciski beda czytelne, a uzytkownik moze przesuwac palcem/myszka zeby zobaczyc wszystkie kategorie.


# Dodanie kategorii OFERTOWANIE do panelu szczegolowego kontaktu

## Problem

W widoku szczegolowym kontaktu (DealContactDetailSheet) w sekcji KATEGORIA brakuje przycisku "OFERTOWANIE". Konfig istnieje (linia 63), ale tablica kategorii do renderowania (linia 264) nie zawiera `'offering'`.

## Rozwiazanie

Jedna zmiana w pliku `src/components/deals-team/DealContactDetailSheet.tsx`:

- Linia 264: dodac `'offering'` do tablicy kategorii
- Zmiana z: `['hot', 'top', 'lead', '10x', 'cold', 'lost']`
- Na: `['hot', 'offering', 'top', 'lead', '10x', 'cold', 'lost']`

Offering jest umieszczone po HOT (zgodnie z kolejnoscia w lejku: HOT -> OFERTOWANIE -> TOP -> LEAD -> 10x -> COLD -> PRZEGRANE).

## Szczegoly techniczne

### Plik: `src/components/deals-team/DealContactDetailSheet.tsx`

Zmiana w linii 264 -- dodanie `'offering'` do tablicy kategorii renderowanych jako przyciski w sekcji KATEGORIA.

Logika promowania (linie 275-276) moze wymagac rozszerzenia o `'offering'` jesli klikniecie w Ofertowanie powinno rowniez otwierac dialog promowania (tak jak TOP i HOT). Jezeli nie -- wystarczy sam wpis w tablicy.

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/DealContactDetailSheet.tsx` | Dodanie `'offering'` do tablicy kategorii (linia 264) |

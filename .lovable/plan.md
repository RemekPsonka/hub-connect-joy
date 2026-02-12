
# Prowizja zawsze w % -- dla wszystkich kategorii

## Problem

Obecnie tylko kategoria `client` traktuje pole prowizji jako procent. Dla pozostalych (HOT, TOP, LEAD, COLD) pole jest oznaczone "Prowizja (PLN)" i wartosc jest zapisywana jako kwota. Na przykladzie ze screenshota: wpisano 18 (myslac o 18%), ale system zapisal 18 PLN zamiast 90 000 PLN (18% z 500K).

## Rozwiazanie

Ujednolicenie logiki -- pole prowizji **zawsze** przyjmuje procent, niezaleznie od kategorii. Kwota prowizji (`expectedCommission`) jest obliczana automatycznie.

## Zmiany w pliku `src/components/deals-team/ClientProductsPanel.tsx`

1. **Usuniecie warunku `isClient`** z logiki obliczen -- ta sama formula dla wszystkich:
   - `commissionPercent = parseFloat(commission)` (wpisany procent)
   - `expectedCommission = dealValue * (commissionPercent / 100)` (obliczona kwota)

2. **Etykieta pola**: zawsze "Prowizja (%)" -- usuniecie warunkowego przelaczania

3. **Placeholder i walidacja**: zawsze `min=0`, `max=100`, placeholder "np. 8"

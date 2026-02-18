
# Przycisk "Znam te osobe" widoczny rowniez po dopasowaniu

## Problem
Obecnie akcje (w tym "Znam te osobe!") sa widoczne tylko gdy `item.status === 'active'`. Po dopasowaniu status zmienia sie na `fulfilled` i przyciski znikaja. Uzytkownik chce, zeby przycisk byl nadal dostepny -- dopasowanie oznacza jedynie "taki kontakt jest w bazie", ale proces moze wymagac dalszych krokow.

## Zmiana

### Plik: `src/components/wanted/WantedContactCard.tsx`

1. **Warunek wyswietlania akcji** -- zmiana z:
   ```
   item.status === 'active' && !isExpired
   ```
   na:
   ```
   (item.status === 'active' || item.status === 'fulfilled' || item.status === 'in_progress') && !isExpired
   ```
   Czyli akcje beda widoczne dla wszystkich statusow oprocz `cancelled` i `expired`.

2. **Warunek wyswietlania sugestii AI** -- analogicznie rozszerzyc z `item.status === 'active'` na `item.status !== 'cancelled' && item.status !== 'expired'`, zeby sugestie AI tez byly widoczne po dopasowaniu.

## Efekt
- Po dopasowaniu kafelek pokaze "Dopasowano: Marek Warzecha" ORAZ nadal bedzie mial przyciski "Znam te osobe!", "Udostepnij" i usuwanie.
- Uzytkownik moze ponownie kliknac "Znam te osobe!" i zmienic dopasowanie jesli to nie ta osoba.

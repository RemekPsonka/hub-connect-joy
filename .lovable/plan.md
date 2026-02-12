

# Dodanie opcji przesuwania w lejku (zmiana kategorii)

## Problem

Aktualnie badge'e lejkowe sa statyczne -- mozna tylko dodac kontakt do lejka lub go usunac. Brakuje mozliwosci zmiany kategorii (np. COLD -> LEAD -> TOP) bezposrednio z poziomu badge'a.

## Rozwiazanie

Klikniecie na badge lejkowy otworzy maly popover z lista kategorii (COLD/LEAD/TOP/HOT/CLIENT), pozwalajacy na szybka zmiane etapu. Hook `useUpdateTeamContact` juz istnieje i obsluguje zmiane kategorii -- trzeba tylko dodac UI.

### 1. `DealFunnelBadges.tsx` (widok listy kontaktow)

Zamiana statycznych Badge na klikalne elementy otwierajace Popover z przyciskami kategorii:
- Klikniecie badge'a otwiera mini-popover z 5 przyciskami kategorii
- Wybranie nowej kategorii wywoluje `useUpdateTeamContact` z nowa kategoria
- Po zmianie popover sie zamyka, badge odswieza sie automatycznie
- Dodanie invalidacji `contact-deal-teams-bulk` w `useUpdateTeamContact` (brakuje tam tego klucza)

### 2. `ContactDealsPanel.tsx` (widok szczegolowy kontaktu)

Podobna zmiana -- klikniecie badge'a otwiera popover ze zmiana kategorii:
- Badge staje sie triggerem Popover
- Popover zawiera przyciski kategorii + przycisk usuwania
- Nawigacja do zespolu przeniesiona na ikone lub osobny link

### 3. Cache invalidation w `useUpdateTeamContact`

Dodanie brakujacych kluczy invalidacji:
- `contact-deal-teams` (panel szczegolowy)
- `contact-deal-teams-bulk` (lista kontaktow)

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/contacts/DealFunnelBadges.tsx` | Badge klikalny z popoverem do zmiany kategorii |
| `src/components/contacts/ContactDealsPanel.tsx` | Badge klikalny z popoverem do zmiany kategorii |
| `src/hooks/useDealsTeamContacts.ts` | Dodanie invalidacji `contact-deal-teams` i `contact-deal-teams-bulk` w `useUpdateTeamContact` |


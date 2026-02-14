
# Przeniesienie wskaznika aktywnego zadania na lewa strone kart Kanban

## Zakres
Zmiana dotyczy WSZYSTKICH kart kontaktowych w Kanbanie - 4 komponenty pokrywajace 7 kolumn:

| Komponent | Uzywany w kolumnach |
|---|---|
| `HotLeadCard` | HOT LEAD, OFERTOWANIE |
| `TopLeadCard` | TOP LEAD |
| `LeadCard` | LEAD |
| `ColdLeadCard` | 10x, COLD, PRZEGRANE |

`ProspectCard` (kolumna POSZUKIWANI) nie ma zadan - nie dotyczy.

## Zmiana w kazdym z 4 plikow (identyczna)
Przeniesienie bloku `{taskStatus && (...)}` z pozycji po firmie (linie ~43-52) na poczatek wiersza flex (przed imie kontaktu, linia ~32).

Obecny uklad:
```text
Imie Nazwisko · Firma [ptaszek]          [kropka]
```

Nowy uklad:
```text
[ptaszek] Imie Nazwisko · Firma          [kropka]
```

## Pliki do edycji
- `src/components/deals-team/HotLeadCard.tsx`
- `src/components/deals-team/TopLeadCard.tsx`
- `src/components/deals-team/LeadCard.tsx`
- `src/components/deals-team/ColdLeadCard.tsx`

Brak zmian w logice, kolorach ani propsach - wylacznie zmiana kolejnosci elementow w renderze.

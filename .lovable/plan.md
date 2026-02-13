
# Naprawa panelu bocznego kontaktu - pelna widocznosc

## Problem
Panel boczny uzywa komponentu `Sheet` z bazowym wariantem `right`, ktory ma twardo ustawione `sm:max-w-sm` (384px). Mimo ze `DealContactDetailSheet` nadpisuje to na `sm:max-w-xl`, ScrollArea wewnatrz zabiera dodatkowa przestrzen na scrollbar, co powoduje ucinanie zawartosci (np. przycisk "+ Nowe zadanie").

## Rozwiazanie - 2 zmiany

### 1. Plik: `src/components/ui/sheet.tsx` (linia 40-41)

Usuniecie restrykcyjnego `sm:max-w-sm` z wariantu `right`, aby klasy nadpisujace w komponentach potomnych dzialaly poprawnie:

```
Przed:
right: "inset-y-0 right-0 h-full w-3/4  border-l ... sm:max-w-sm"

Po:
right: "inset-y-0 right-0 h-full w-3/4  border-l ..."
```

Analogiczna zmiana dla wariantu `left` (linia 39), aby zachowac spojnosc.

### 2. Plik: `src/components/deals-team/DealContactDetailSheet.tsx` (linia 204)

Ustawienie konkretnej szerokosci panelu na 640px (`sm:max-w-xl`) z dodatkowym `overflow-hidden` dla pewnosci:

```
Przed:
className="w-full sm:max-w-xl p-0 flex flex-col"

Po:
className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden"
```

## Efekt

- Panel bedzie mial 640px szerokosci (xl) bez konfliktu z bazowym sm:max-w-sm
- Przycisk "+ Nowe zadanie" bedzie w pelni widoczny
- Badge kategorii (HOT, OFERTOWANIE, TOP itd.) beda sie miescily
- ScrollArea nie bedzie ucinac zawartosci po prawej stronie

## Uwaga

Zmiana w `sheet.tsx` usuwa domyslne ograniczenie `sm:max-w-sm` — inne komponenty uzywajace Sheet powinny same ustawiac max-width w className (co jest standardowa praktyka w shadcn).

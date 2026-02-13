

# Zamiana panelu bocznego kontaktu na popup (Dialog)

## Problem
Panel boczny (Sheet) ucina dane po prawej stronie - przyciski kategorii, "+ Nowe zadanie" i inne elementy sa obciete. Mimo wielu poprawek szerokosci, Sheet z ScrollArea nadal nie wyswietla pelnej zawartosci.

## Rozwiazanie
Zamiana komponentu `Sheet` na `Dialog` (popup wycentrowany na ekranie) w pliku `DealContactDetailSheet.tsx`. Dialog daje pelna kontrole nad szerokoscia i nie ma problemow z ucinaniem zawartosci.

## Szczegoly techniczne

### Plik: `src/components/deals-team/DealContactDetailSheet.tsx`

**Zmiany:**

1. Zamiana importow:
   - Usuniecie: `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription`
   - Dodanie: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription` z `@/components/ui/dialog`

2. Zamiana struktury JSX (linie 202-718):
   - `Sheet` -> `Dialog`
   - `SheetContent` -> `DialogContent` z klasa `max-w-2xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden`
   - `SheetHeader` -> `DialogHeader`
   - `SheetTitle` -> `DialogTitle`
   - `SheetDescription` -> `DialogDescription`
   - Usuniecie `side="right"` (Dialog nie ma tego propa)

3. ScrollArea pozostaje bez zmian - opakowuje zawartosc ponizej headera

4. Usuniecie propa `side` z interfejsu (nie jest potrzebny)

**Efekt koncowy:**
- Popup wycentrowany na ekranie, 672px szerokosci (max-w-2xl)
- Maksymalna wysokosc 85% viewportu z wewnetrznym scrollem
- Wszystkie dane widoczne: kategorie, przyciski, notatki, zadania
- Zero uciecia po prawej stronie
- Zachowana cala dotychczasowa funkcjonalnosc (edycja statusu, kategorie, notatki, zadania, brief AI, statusy tygodniowe, historia)

### Zadne inne pliki nie wymagaja zmian
Komponent jest uzywany w innych miejscach przez te same propsy (`open`, `onOpenChange`, `contact`, `teamId`) - interfejs nie ulega zmianie.


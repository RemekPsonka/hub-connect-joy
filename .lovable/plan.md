
# Poprawa widocznosci sekcji ZADANIA w panelu bocznym kontaktu

## Problem

Przycisk "Nowe zadanie", ikony edycji i statusu **istnieja i dzialaja poprawnie** w kodzie. Problem polega na tym, ze sekcja ZADANIA jest **szosta sekcja od gory** panelu bocznego. Uzytkownik musi scrollowac bardzo daleko w dol, zeby do niej dotrzec. Kolejnosc sekcji w panelu:

1. Status
2. Kategoria
3. Notatki
4. Brief AI
5. Statusy tygodniowe
6. **ZADANIA** (tutaj jest przycisk "Nowe zadanie")
7. Historia aktywnosci
8. Produkty / Deale

## Rozwiazanie

Przesuniecie sekcji ZADANIA **na trzecie miejsce** (zaraz po Notatki), poniewaz zadania sa najczesciej uzywana funkcja i powinny byc latwo dostepne bez scrollowania.

Nowa kolejnosc:
1. Status
2. Kategoria
3. Notatki
4. **ZADANIA** (przesuniety wyzej)
5. Brief AI
6. Statusy tygodniowe
7. Historia aktywnosci
8. Produkty / Deale

## Szczegoly techniczne

Plik: `src/components/deals-team/DealContactDetailSheet.tsx`

Zmiana polega na **przeniesieniu bloku kodu** sekcji ZADANIA (linie ~462-590, od `<Separator />` przed `{/* Tasks */}` do konca zamkniecia `</section>` z zamknietymi zadaniami) w inne miejsce w pliku — **przed sekcje Brief AI** (obecnie linia ~307).

| Element | Obecna pozycja | Nowa pozycja |
|---------|---------------|-------------|
| Sekcja ZADANIA (caly blok ~462-590) | Po "Statusy tygodniowe" | Po "Notatki" (przed "Brief AI") |

Zadne inne zmiany nie sa wymagane — przycisk "Nowe zadanie", inline edycja, status cycling i priorytety sa juz poprawnie zaimplementowane.

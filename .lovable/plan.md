
# Poszerzenie panelu bocznego kontaktu

## Problem
Panel boczny ma ustawione `sm:max-w-lg` (512px), przez co elementy sa ucinane na prawej krawedzi — przyciski "Nowe zadanie", badge kategorii i inne elementy nie mieszcza sie w widoku.

## Rozwiazanie

Jedna zmiana w pliku `src/components/deals-team/DealContactDetailSheet.tsx`:

### Zmiana szerokosci panelu (linia 204)

Zmiana klasy z `sm:max-w-lg` na `sm:max-w-xl` (640px) lub `sm:max-w-2xl` (672px):

```
Przed: className="w-full sm:max-w-lg p-0 flex flex-col"
Po:    className="w-full sm:max-w-xl p-0 flex flex-col"
```

To da dodatkowe ~128px szerokosci, dzieki czemu:
- Przyciski "Nowe zadanie" i inne beda widoczne
- Badge kategorii (HOT, OFERTOWANIE, TOP, LEAD, 10x, COLD) beda sie miescily w jednym wierszu
- Sekcje nie beda ucinane na prawej krawedzi

## Szczegoly techniczne

| Plik | Linia | Zmiana |
|------|-------|--------|
| `src/components/deals-team/DealContactDetailSheet.tsx` | 204 | `sm:max-w-lg` na `sm:max-w-xl` |

Jedna linia do zmiany, zero nowych zaleznosci.

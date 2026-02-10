
# Inteligentne scalanie numerow telefonow

## Problem
Wiele kontaktow ma numer stacjonarny zapisany w polu `phone` (telefon prywatny/komorkowy) z powodu starego bledu w imporcie. Przy ponownym skanowaniu wizytowek merge nie nadpisuje istniejacego numeru, wiec numer komorkowy jest odrzucany.

Przyklad: Grzegorz Brachaczek ma `phone: +48338108428` (stacjonarny), a wizytowka zawiera komorkowy `+48 660 919 504` -- ktory jest ignorowany.

## Rozwiazanie

### Plik: `supabase/functions/merge-contacts/index.ts`

Dodanie funkcji `isMobileNumber` wykrywajacej polskie numery komorkowe (prefiksy 5xx, 6xx, 7xx, 8xx po +48) oraz inteligentnej logiki zamiany:

```text
Logika scalania telefonow:

1. Jesli istniejacy phone jest stacjonarny, a nowy phone jest komorkowy:
   -> Przenies stacjonarny do phone_business (jesli puste)
   -> Ustaw komorkowy jako phone

2. Jesli phone jest puste:
   -> Ustaw nowy phone

3. Jesli phone_business jest puste:
   -> Ustaw nowy phone_business
```

Funkcja rozpoznawania typu numeru:
- Numery komorkowe w Polsce zaczynaja sie od +48 5xx, 6xx, 7xx, 8xx
- Numery stacjonarne zaczynaja sie od +48 1x, 2x, 3x, 4x (kody kierunkowe miast)

### Efekt
Po wdrozeniu tej zmiany, ponowne zeskanowanie wizytowek spowoduje:
- Automatyczne przeniesienie numerow stacjonarnych z pola `phone` do `phone_business`
- Wstawienie numerow komorkowych w pole `phone`
- Bez recznego poprawiania kazdego kontaktu z osobna

### Plik do modyfikacji
1. `supabase/functions/merge-contacts/index.ts` -- dodanie detekcji typu numeru i logiki zamiany

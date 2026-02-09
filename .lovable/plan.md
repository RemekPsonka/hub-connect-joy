

# Naprawa wyszukiwania kontaktow w ConnectionContactSelect

## Problem

Komponent `ConnectionContactSelect` (plik `src/components/network/ConnectionContactSelect.tsx`) pobiera z bazy danych **tylko 100 pierwszych kontaktow** (linia 57: `.limit(100)`), posortowanych alfabetycznie po `full_name`. Wyszukiwanie odbywa sie po stronie klienta w tych 100 kontaktach.

Kontakty z nazwiskami zaczynajacymi sie na pozniejsze litery (np. "Laz...", "M...", "Z...") nie sa w ogole pobierane i dlatego nie pojawiaja sie w wynikach wyszukiwania.

## Rozwiazanie

Zmienic logike na **wyszukiwanie po stronie serwera** (server-side search). Zamiast pobierac 100 kontaktow i filtrowac lokalnie, kazde wpisanie tekstu w pole wyszukiwania wywoła zapytanie do bazy z filtrem `ilike`.

## Zmiany techniczne

### Plik: `src/components/network/ConnectionContactSelect.tsx`

1. **Usunac** staly query pobierajacy 100 kontaktow
2. **Dodac debounced search query** -- zapytanie do bazy z filtrem `ilike` na `full_name` i `company`, uruchamiane po wpisaniu tekstu (debounce 300ms)
3. **Osobny query na wybrany kontakt** -- jesli `value` jest ustawione, pobrac ten kontakt osobno (zeby wyswietlic nazwe w przycisku)
4. **Zachowac wirtualizacje** -- lista wynikow dalej uzywa `useVirtualizer` dla wydajnosci
5. **Usunac `.limit(100)`** z glownego query -- zamiast tego limit na wyniki search query (np. 50)

Logika:
- Gdy pole wyszukiwania puste: pokaz pierwsze 50 kontaktow (lub nic)
- Gdy uzytkownik wpisze tekst: zapytanie do bazy z `or(full_name.ilike.%tekst%, company.ilike.%tekst%)`, limit 50
- Debounce 300ms zeby nie przeciazac bazy

### Wplyw

Ten komponent jest uzywany we **wszystkich formularzach**:
- WantedContactModal (Kto szuka)
- MatchWantedDialog (Wybierz kontakt)
- AddConnectionModal (Kontakt A, Kontakt B)
- TaskModal (Kontakt, Kontakt A, Kontakt B)
- ProjectContactsTab

Jedna zmiana w `ConnectionContactSelect.tsx` naprawi wyszukiwanie we wszystkich formularzach jednoczesnie.


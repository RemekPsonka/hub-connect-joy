
# Poprawa UX wyszukiwania kontaktow w projekcie

## Problem
Gdy uzytkownik szuka kontaktu, ktory juz jest przypisany do projektu, widzi "Brak kontaktow" zamiast informacji, ze kontakt jest juz dodany. To mylace.

## Rozwiazanie
Zmienic komunikat w `ConnectionContactSelect` tak, aby rozroznial dwie sytuacje:
1. Brak wynikow wyszukiwania -- "Brak kontaktow"
2. Wszystkie wyniki zostaly odfiltrowane (bo juz sa w projekcie) -- "Kontakt juz dodany do projektu"

## Zmiana w pliku

### `src/components/network/ConnectionContactSelect.tsx`
- Dodanie propa `excludeIds` do logiki wyswietlania pustego stanu
- Porownanie `contacts.length` (przed filtrowaniem) z `filteredContacts.length` (po filtrowaniu)
- Jesli `contacts.length > 0` ale `filteredContacts.length === 0` -- wyswietlic "Kontakt juz dodany do projektu"
- Jesli `contacts.length === 0` -- wyswietlic standardowy "Brak kontaktow"

```text
Logika:
if (search < 2 chars)     -> "Wpisz min. 2 znaki..."
if (contacts == 0)         -> "Brak kontaktów"
if (filtered == 0)         -> "Kontakt już dodany do projektu"
```

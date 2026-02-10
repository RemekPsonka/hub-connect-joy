
# Kompaktowe znaczniki grup na liscie kontaktow

## Problem
Badge grupy na liscie kontaktow zajmuje za duzo miejsca -- pelna nazwa grupy (np. "Baza kontaktow biznesowych") jest wyswietlana w duzym badge'u, co psuje uklad tabeli.

## Rozwiazanie
Zamiana pelnego badge'a na kompaktowy znacznik: mala kolorowa kropka + skrocona nazwa (max ~12 znakow) wyswietlana obok. Dla list kontaktow badge bedzie mial wariant "compact".

### Plik: `src/components/contacts/GroupBadge.tsx`
- Dodanie propa `compact?: boolean`
- W trybie compact: mala kolorowa kropka (8x8px) + skrocona nazwa grupy (truncate, max-width)
- W trybie domyslnym: bez zmian (inne miejsca w aplikacji dalej uzyja pelnego badge'a)
- Brak grupy w trybie compact: szary tekst "–" zamiast pelnego badge'a "Brak grupy"

### Plik: `src/components/contacts/ContactsTable.tsx`
- Przekazanie `compact` do `GroupBadge` w tabeli kontaktow

### Wyglad compact:
```text
[● Baza kont...]   -- kolorowa kropka + skrocona nazwa
```

Zamiast obecnego:
```text
[  Baza kontaktow biznesowych  ]  -- duzy czerwony badge
```

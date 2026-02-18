
# Poprawki w module Poszukiwani

## Problem 1: Wybor dyrektora powinien zamykac dialog
Obecnie po wybraniu dyrektora system probuje znalezc go w tabeli `contacts` i jesli nie znajdzie -- przelacza na wyszukiwanie CRM. To zle. Wybranie dyrektora oznacza: "ten dyrektor zna te osobe". Dialog powinien sie zamknac, a `matched_by` powinien wskazywac na wybranego dyrektora (nie na aktualnie zalogowanego).

**Zmiana w `MatchWantedDialog.tsx`:**
- `handleDirectorMatch` zamiast szukac kontaktu w CRM, od razu aktualizuje `wanted_contacts`:
  - `matched_by = director.id` (wybrany dyrektor, nie aktualny user)
  - `status = 'in_progress'` (ktos zna, ale jeszcze nie zamkniete)
  - `matched_at = now()`
  - BEZ ustawiania `matched_contact_id` i `status: fulfilled`
- Dialog zamyka sie od razu po kliknieciu dyrektora
- Opcja "Inny -- szukaj w CRM" nadal dziala jak dotychczas (szuka kontaktu CRM i ustawia `matched_contact_id`)

**Nowy hook `useClaimWantedContact` w `useWantedContacts.ts`:**
- Osobna mutacja ktora aktualizuje tylko `matched_by`, `matched_at`, `status: 'in_progress'` -- bez `matched_contact_id`

## Problem 2: Filtr "Kto zna te osobe" na stronie Poszukiwani

**Zmiana w `WantedContactFilters` + `useWantedContacts`:**
- Dodac pole `matchedBy?: string` do filtrow
- W zapytaniu: `query = query.eq('matched_by', filters.matchedBy)`

**Zmiana w `WantedContacts.tsx`:**
- Dodac nowy `Select` z lista dyrektorow (z `useDirectors()`)
- Opcje: "Wszyscy" + lista dyrektorow
- Wartosc filtra to `director.id`

**Zmiana w `useWantedContacts` select:**
- Dodac join na `matched_by` zeby moc wyswietlic imie dyrektora ktory zna:
  ```
  matched_by_director:directors!wanted_contacts_matched_by_fkey(id, full_name)
  ```

**Zmiana w `WantedContactCard.tsx`:**
- Wyswietlic "Zna: [imie dyrektora]" obok "Szuka: [kontakt]" gdy `matched_by` jest ustawiony

## Problem 3: Lista TOP kontaktow na stronie Poszukiwani
Przeniesc/dodac sekcje z TOP kontaktami (kategoria `top` z `deal_team_contacts`) na strone Poszukiwani.

**Nowa sekcja w `WantedContacts.tsx`:**
- Pod filtrami, przed lista poszukiwanych
- Zapytanie do `deal_team_contacts` z filtrem `category = 'top'`
- Prosta lista z imieniem i firma, kompaktowy format
- Tytul sekcji: "TOP Kontakty"

---

## Szczegoly techniczne

### Pliki do zmiany:

1. **`src/hooks/useWantedContacts.ts`**
   - Dodac `useClaimWantedContact()` -- mutacja ustawiajaca `matched_by`, `matched_at`, `status: 'in_progress'`
   - Rozszerzyc `WantedContactFilters` o `matchedBy?: string`
   - Dodac filtr `matched_by` w `useWantedContacts`
   - Dodac join `matched_by_director` w selectach
   - Dodac `matched_by_director` do interfejsu `WantedContact`

2. **`src/components/wanted/MatchWantedDialog.tsx`**
   - `handleDirectorMatch` -- uzyc `useClaimWantedContact` zamiast szukania w CRM
   - Zamknac dialog po wybraniu dyrektora

3. **`src/pages/WantedContacts.tsx`**
   - Dodac filtr `matchedBy` z lista dyrektorow
   - Dodac sekcje TOP kontaktow (zapytanie do `deal_team_contacts` gdzie `category = 'top'`)

4. **`src/components/wanted/WantedContactCard.tsx`**
   - Wyswietlic "Zna: [dyrektor]" gdy `matched_by_director` jest dostepny

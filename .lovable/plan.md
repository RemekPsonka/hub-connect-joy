

# Scalanie zaznaczonych kontaktow

## Co sie zmieni

Po zaznaczeniu 2+ kontaktow w tabeli pojawi sie nowy przycisk **"Scal zaznaczone"**. Po kliknieciu otwiera sie modal z porownaniem danych obu kontaktow -- uzytkownik dla kazdego pola wybiera ktora wartosc zachowac (lub obie, jesli pole to wspiera). Po zatwierdzeniu kontakt "glowny" zostaje zaktualizowany wybranymi wartosciami, a duplikat jest dezaktywowany (soft delete).

## Zmiany w plikach

### 1. Nowy komponent: `src/components/contacts/BulkMergeContactModal.tsx`

Modal scalania zaznaczonych kontaktow:
- Pobiera pelne dane obu kontaktow z bazy (select *)
- Dla kazdego pola wyswietla wartosc z kontaktu A i kontaktu B
- Uzytkownik klika na wartosc ktora chce zachowac (radio-like UI) -- zaznaczona wartosc jest podswietlona
- Pola obslugiwane:
  - **Proste (wybierz jedno):** full_name, first_name, last_name, email, phone, phone_business, company, position, city, linkedin_url, source, address, email_secondary, address_secondary, notes, profile_summary
  - **Laczenie:** tags (checkboxy, domyslnie wszystkie), notes (opcja polaczenia)
  - **Automatyczne:** primary_group_id (wybor), company_id, relationship_strength (wyzszy)
- Podglad wyniku scalenia na dole
- Przyciski: "Anuluj", "Scal kontakty"
- Po scaleniu: kontakt "przegrany" dostaje is_active=false, kontakt "zwyciezca" aktualizowany
- Powiazane rekordy (needs, offers, tasks, consultations) przenoszone na zwyciezce

### 2. Nowa edge function: `supabase/functions/bulk-merge-contacts/index.ts`

- Przyjmuje: `primaryContactId`, `secondaryContactId`, `mergedFields` (obiekt z wybranymi wartosciami)
- Weryfikuje auth i dostep do obu kontaktow
- Aktualizuje primary contact wybranymi polami
- Przenosi powiazane rekordy z secondary na primary:
  - `needs` (contact_id)
  - `offers` (contact_id)
  - `task_contacts` (contact_id)
  - `consultations` (contact_id)
  - `contact_activity_log` (contact_id)
- Soft-delete secondary contact (is_active = false)
- Loguje scalenie w `contact_merge_history` i `contact_activity_log`

### 3. Modyfikacja: `src/components/contacts/ContactsTable.tsx`

- Dodac przycisk "Scal zaznaczone" (ikona Merge/GitMerge) obok "Usun zaznaczone" -- widoczny tylko gdy zaznaczono dokladnie 2 kontakty
- Stan `isMergeOpen` do kontroli modalu
- Po scaleniu: odswiezyc liste i wyzerowac zaznaczenie

### 4. Modyfikacja: `src/hooks/useContacts.ts`

- Dodac `useBulkMergeContacts` mutation hook:
  - Wywoluje edge function `bulk-merge-contacts`
  - Invaliduje queries kontaktow
  - Toast sukcesu

## UI modalu scalania

```text
Scalanie kontaktow
Wybierz wartosci ktore chcesz zachowac w scalonym kontakcie.

Pole            | Kontakt A (wybor)     | Kontakt B (wybor)
----------------|----------------------|--------------------
Imie i nazwisko | [x] Dominik Leszcz.. | [ ] Dominik Leszcz..
Email           | [x] d.leszczynski@.. | [ ] d.leszczynski@..
Telefon pryw.   | [x] +48601443...     | [ ] +48 601 44...
Firma           | [ ] -                | [ ] -
Stanowisko      | [ ] -                | [ ] -
Grupa           | [x] Czlonkowie CC    | [ ] Baza kont. bizn.
Tagi            | [v] tag1  [v] tag2   | [v] tag3           (checkboxy)
Notatki         | [x] Zachowaj A       | [ ] Zachowaj B  [ ] Polacz

                              [Anuluj]  [Scal kontakty]
```

Domyslnie zaznaczony jest kontakt z bardziej kompletnymi danymi (wiecej wypelnionych pol). Dla pol gdzie obie wartosci sa identyczne -- automatycznie zaznaczone, bez mozliwosci wyboru.

## Logika przenoszenia powiazanych rekordow

Edge function po scaleniu przeniesie wszystkie powiazane rekordy z kontaktu B na kontakt A:

```text
UPDATE needs SET contact_id = primaryId WHERE contact_id = secondaryId
UPDATE offers SET contact_id = primaryId WHERE contact_id = secondaryId
UPDATE task_contacts SET contact_id = primaryId WHERE contact_id = secondaryId
UPDATE consultations SET contact_id = primaryId WHERE contact_id = secondaryId
UPDATE contact_activity_log SET contact_id = primaryId WHERE contact_id = secondaryId
```

## Ograniczenia

- Scalanie dokladnie 2 kontaktow (nie wiecej) -- przy 3+ przycisk nieaktywny z tooltipem "Zaznacz dokladnie 2 kontakty"
- Scalanie nieodwracalne (ale secondary kontakt pozostaje w bazie jako nieaktywny)

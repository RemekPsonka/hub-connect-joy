
# Naprawa wyświetlania uczestników -- duplikaty kluczy obcych

## Problem

W bazie danych istnieją **zduplikowane klucze obce** na tabeli `meeting_participants`:
- `fk_meeting_participants_contact` i `meeting_participants_contact_id_fkey` -- oba wskazują na `contacts`
- `fk_meeting_participants_meeting` i `meeting_participants_meeting_id_fkey` -- oba wskazują na `group_meetings`
- `fk_meeting_participants_prospect` i `meeting_participants_prospect_id_fkey` -- oba wskazują na `meeting_prospects`

PostgREST nie może rozwiązać tej dwuznaczności (nawet z hintem `!contact_id`), więc zapytanie zwraca błąd i lista uczestników jest pusta.

Dane są prawidłowo zapisane w bazie (potwierdzono bezpośrednim zapytaniem SQL).

## Rozwiązanie

### 1. Migracja SQL -- usunięcie duplikatów

Usunięcie zduplikowanych kluczy obcych (zachowamy te z krótszymi nazwami):

```text
ALTER TABLE meeting_participants DROP CONSTRAINT fk_meeting_participants_contact;
ALTER TABLE meeting_participants DROP CONSTRAINT fk_meeting_participants_meeting;
ALTER TABLE meeting_participants DROP CONSTRAINT fk_meeting_participants_prospect;
```

### 2. Aktualizacja zapytania w `src/hooks/useMeetings.ts`

Zmiana hintów na nazwy pozostałych constraintów:

```text
contact:contacts!meeting_participants_contact_id_fkey(...)
prospect:meeting_prospects!meeting_participants_prospect_id_fkey(...)
```

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| Migracja SQL | Usunięcie 3 zduplikowanych FK |
| `src/hooks/useMeetings.ts` | Aktualizacja hintów PostgREST na nazwy pozostałych constraintów |

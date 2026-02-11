
# Naprawa panelu DEALS -- brakujący klucz obcy

## Problem

Zapytanie `useContactDealTeams` zwraca **błąd 400**: `Could not find a relationship between 'deal_team_contacts' and 'deal_teams'`.

Przyczyna: tabela `deal_team_contacts` nie ma **żadnych kluczy obcych** -- wszystkie FK zostały prawdopodobnie przypadkowo usunięte w poprzedniej migracji (usuwanie duplikatów na `meeting_participants`). PostgREST wymaga FK do wykonania joinów.

Dane Roberta Kiepury **są poprawnie zapisane** w bazie (team: SGU, kategoria: lead), ale panel DEALS nie może ich pobrać z powodu brakującego joina.

## Rozwiązanie

### 1. Migracja SQL -- odtworzenie kluczy obcych

Dodanie brakujących FK na tabeli `deal_team_contacts`:

```text
ALTER TABLE deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_team_id_fkey 
    FOREIGN KEY (team_id) REFERENCES deal_teams(id) ON DELETE CASCADE;

ALTER TABLE deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
```

### 2. Brak zmian w kodzie

Hook `useContactDealTeams` jest poprawny -- join `deal_teams(name, color)` zadziała automatycznie po przywróceniu FK.

## Pliki do modyfikacji

| Element | Zmiana |
|---|---|
| Migracja SQL | Dodanie 3 kluczy obcych na `deal_team_contacts` |
| Kod frontend | Bez zmian |

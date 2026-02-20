
# Integracja "Poszukiwani" z modulu CRM w lejku sprzedazy

## Cel
Kolumna "POSZUKIWANI" w Kanbanie lejka bedzie wyswietlac rowniez wpisy z tabeli `wanted_contacts` (modul CRM "Poszukiwani"). Uzytkownik bedzie mogl skonfigurowac, ktorych kontaktow CRM "monitoruje" -- ich wpisy wanted_contacts pojawia sie w lejku.

## Rozwiazanie

### 1. Nowa tabela: `deal_team_watched_contacts`

Przechowuje konfiguracje: ktore kontakty CRM sa monitorowane w danym zespole.

```sql
CREATE TABLE deal_team_watched_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES deal_teams(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  added_by UUID REFERENCES directors(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, contact_id)
);
```
+ RLS: tenant_id match + team membership check.

### 2. Nowy hook: `useTeamWatchedWanted`

- `useTeamWatchedContacts(teamId)` -- pobiera liste monitorowanych kontaktow CRM
- `useWantedForWatchedContacts(contactIds)` -- pobiera wanted_contacts gdzie `requested_by_contact_id` jest w liscie monitorowanych kontaktow (status != cancelled/expired)
- `useAddWatchedContact(teamId, contactId)` / `useRemoveWatchedContact`

### 3. Modyfikacja: `KanbanBoard.tsx`

- Importowac nowy hook `useTeamWatchedWanted`
- W kolumnie "POSZUKIWANI" wyswietlac dwie sekcje:
  - Istniejace karty `ProspectCard` (deal_team_prospects)
  - Nowe karty `WantedKanbanCard` (wanted_contacts z monitorowanych kontaktow)
- Count w badge = prospects.length + wantedItems.length

### 4. Nowy komponent: `WantedKanbanCard.tsx`

Kompaktowa karta wanted_contact dostosowana do Kanbana:
- Nazwa osoby/firmy
- Badge statusu (active/in_progress/fulfilled)
- Kto szuka (requested_by_contact)
- Kto zna (matched_by_director) jesli jest
- Przycisk "Znam te osobe!" (istniejacy flow)

### 5. Nowy komponent: `WatchedContactsConfig.tsx`

Dialog/popover konfiguracji dostepny z ustawien zespolu (TeamSettings) lub bezposrednio z kolumny POSZUKIWANI:
- Wyszukiwarka kontaktow CRM
- Lista aktualnie monitorowanych kontaktow z mozliwoscia usuniecia
- Przycisk "Dodaj" do monitorowania nowego kontaktu

### 6. Modyfikacja: `TeamSettings.tsx`

Dodac sekcje "Monitorowani kontakty (Poszukiwani)" z komponentem `WatchedContactsConfig`.

### 7. Modyfikacja: kolumna POSZUKIWANI w `KanbanBoard.tsx`

Zmienic przycisk "Szukaj" na dwie opcje:
- "+ Szukaj" (istniejacy -- dodaje prospect)
- Ikona ustawien (otwiera WatchedContactsConfig)

## Szczegoly techniczne

**Pliki do utworzenia:**
1. `src/hooks/useTeamWatchedContacts.ts` -- CRUD hooki dla monitorowanych kontaktow + pobieranie wanted_contacts
2. `src/components/deals-team/WantedKanbanCard.tsx` -- kompaktowa karta wanted w Kanbanie
3. `src/components/deals-team/WatchedContactsConfig.tsx` -- konfiguracja monitorowanych kontaktow

**Pliki do modyfikacji:**
4. `src/components/deals-team/KanbanBoard.tsx` -- integracja wanted w kolumnie POSZUKIWANI
5. `src/components/deals-team/TeamSettings.tsx` -- sekcja konfiguracji monitorowanych kontaktow

**Migracja SQL:**
- Tabela `deal_team_watched_contacts` z RLS
- Polityki: SELECT/INSERT/DELETE dla czlonkow zespolu

**Flow danych:**

```text
TeamSettings / Kolumna POSZUKIWANI
       |
       v
WatchedContactsConfig --> deal_team_watched_contacts
       |                        |
       |                        v (contact_ids)
       |                  wanted_contacts WHERE requested_by_contact_id IN (...)
       |                        |
       v                        v
  [ProspectCard]         [WantedKanbanCard]
       |_______________|
              |
     Kolumna POSZUKIWANI w Kanbanie
```

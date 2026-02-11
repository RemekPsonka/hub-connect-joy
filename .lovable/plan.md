

# Konwersja prospekta do Kanban z poziomu Spotkania

## Podsumowanie

Dodanie mozliwosci konwersji prospekta (uczestnika ze statusem "Prospect") do Kanban zespolu Deals bezposrednio z widoku uczestnikow spotkania (`MeetingParticipantsTab`). Przy kazdej konwersji uzytkownik wskazuje, do jakiego zespolu Deals ma trafic kontakt.

## Zakres zmian

### 1. `src/components/meetings/MeetingParticipantsTab.tsx`

- Dodanie nowej kolumny "Akcje" (lub rozszerzenie istniejacego przycisku usuwania)
- Dla uczestnikow z `prospect_id` -- przycisk "Konwertuj do Kanban" (ikona `ArrowRightCircle` lub `UserCheck`)
- Klikniecie otwiera `ProspectingConvertDialog` z wybranym prospektem
- Potrzebne: pobranie danych prospekta z `meeting_prospects` po `prospect_id` (albo enrichment w uzywanym uzywanym uzywanym query, albo osobny fetch)
- Import `useDealTeams` do pobrania listy zespolow -- uzytkownik wybiera zespol w dialogu

### 2. `src/components/deals-team/ProspectingConvertDialog.tsx`

- Rozszerzenie o **dropdown wyboru zespolu** jesli `teamId` nie jest podany (lub jesli dodamy prop `allowTeamSelection`)
- Nowy opcjonalny prop: `teamId?: string` (zamiast required) + `teams?: DealTeam[]`
- Jesli `teamId` jest undefined -- wyswietl dropdown z lista zespolow przed konwersja
- Reszta logiki (duplikaty, tworzenie kontaktu, dodanie do deal_team_contacts, auto-create BI) -- bez zmian

### 3. `src/hooks/useMeetings.ts` (lub nowy helper)

- Rozszerzenie query `useMeetingParticipants` o enrichment danych prospekta -- albo dodanie helpera `useMeetingProspectById` ktory pobiera pelne dane `MeetingProspect` po ID

## Szczegoly techniczne

### MeetingParticipantsTab -- nowa kolumna/przycisk

```text
// Dla kazdego uczestnika z prospect_id:
{isProspect && (
  <Button size="sm" variant="outline" onClick={() => openConvertDialog(participant)}>
    <ArrowRightCircle className="h-4 w-4 mr-1" />
    Do Kanban
  </Button>
)}
```

### ProspectingConvertDialog -- wybor zespolu

Dodanie na gorze dialogu (gdy brak teamId):

```text
<div className="space-y-2">
  <Label>Zespol Deals</Label>
  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
  </Select>
</div>
```

Konwersja uzywa `selectedTeamId` zamiast stalego `teamId`.

### Fetch danych prospekta

Gdy uzytkownik klika "Do Kanban" na uczestniku, pobieramy pelne dane `MeetingProspect` po `prospect_id`:

```text
const { data } = await supabase
  .from('meeting_prospects')
  .select('*')
  .eq('id', prospectId)
  .single();
```

Te dane przekazujemy do `ProspectingConvertDialog`.

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/meetings/MeetingParticipantsTab.tsx` | Przycisk "Do Kanban" przy prospektach, state dla convert dialogu, import zespolow |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Opcjonalny teamId, dropdown wyboru zespolu gdy brak teamId |

## Workflow

```text
1. Otwieram spotkanie -> zakladka Uczestnicy
2. Widze liste z badge "Prospect" przy niektorych osobach
3. Klikam "Do Kanban" przy prospekcie
4. Otwieram dialog konwersji:
   a. Wybieram zespol Deals (dropdown)
   b. Sprawdzam duplikaty (automatycznie)
   c. Uzupelniam email/telefon/LinkedIn
   d. Wybieram kategorie (COLD/LEAD/TOP/HOT)
   e. Klikam "Konwertuj"
5. Prospekt trafia na Kanban wybranego zespolu
6. Status w meeting_prospects zmienia sie na "converted"
7. Badge uczestnika aktualizuje sie (opcjonalnie)
```

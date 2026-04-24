# Plan-v1: Klikalna agenda → ContactTasksSheet (B2 lazy-fetch)

## Cel
Klik w wiersz agendy w `/sgu/odprawa` otwiera ten sam `ContactTasksSheet`, którego używa kanban SGU. Snapshot agendy zostaje zamrożony, ale Sheet pokazuje aktualne dane kontaktu (lazy fetch z `deal_team_contacts`).

## Pre-flight v2 — weryfikacja

### (a) Hook do reuse — brak idealnego, robimy nowy
- **Istnieje** `useTeamContact(dtc_id)` w `src/hooks/useDealsTeamContacts.ts` (linie 111-165), ale przyjmuje PK z `deal_team_contacts`, a nasz RPC `get_odprawa_agenda` zwraca tylko `contact_id`.
- **Nowy hook**: `useDealTeamContactByContactId(contactId, teamId)` w `src/hooks/useOdprawaAgenda.ts` (dorzucamy do istniejącego pliku — jeden temat domenowy). Powiela strukturę `useTeamContact`, ale z filtrem `(contact_id, team_id)` zamiast `(id)`.
- **Zwraca** pełny obiekt `DealTeamContact` (z join `contact` + `assigned_director`), gotowy do przekazania do `ContactTasksSheet`.

### (b) Pola, których ContactTasksSheet używa z propa `contact`
Z grep recon (`src/components/deals-team/ContactTasksSheet.tsx`):

| Pole | Źródło | Status w `deal_team_contacts` |
|---|---|---|
| `id` (dtc PK) | dtc | ✅ |
| `contact_id` | dtc | ✅ |
| `notes` | dtc | ✅ |
| `temperature` | dtc | ✅ |
| `prospect_source` | dtc | ✅ |
| `client_status` | dtc | ✅ |
| `offering_stage` | dtc | ✅ |
| `category` | dtc | ✅ |
| `status` | dtc | ✅ |
| `priority` | dtc | ✅ |
| `expected_annual_premium_gr` | dtc | ✅ |
| `estimated_value`, `value_currency` | dtc | ✅ |
| `next_action`, `next_action_date`, `next_meeting_date` | dtc | ✅ |
| `status_overdue`, `last_status_update` | dtc | ✅ |
| `assigned_to` | dtc | ✅ |
| `contact` (zagnieżdżony obiekt z `contacts`) | join | ✅ — robimy osobny select (`id, full_name, company, position, email, phone, city, company_id`) |
| `assigned_director` (z `directors`) | join | ✅ — opcjonalny, fetch po `assigned_to` |

**Wszystkie pola istnieją.** Zero ryzyka „brakujący kontrakt".

### (c) Co dotyka FE
1 plik nowy hook (a właściwie dorzucony export do istniejącego), 2 pliki edytowane:

```text
src/hooks/useOdprawaAgenda.ts             [+ export useDealTeamContactByContactId]
src/components/sgu/odprawa/AgendaList.tsx [wiersz klikalny: Card → button-like, onClick]
src/pages/sgu/SGUOdprawa.tsx              [state + render <ContactTasksSheet>]
```

## Implementacja

### 1. Nowy hook (`src/hooks/useOdprawaAgenda.ts`, dopisane na końcu)
- `useDealTeamContactByContactId(contactId: string | null, teamId: string | null)`
- `queryKey: ['deal_team_contact_for_agenda', contactId, teamId]`
- `enabled: !!contactId && !!teamId`
- Pipeline: select z `deal_team_contacts` po `(contact_id, team_id) .maybeSingle()` → jeśli null, zwróć null; w przeciwnym razie dorzuć join `contact` (`contacts.full_name, company, position, email, phone, city, company_id`) + ewentualny fallback na `companies.name` gdy `contact.company` puste + `assigned_director` po `dealContact.assigned_to`.
- Return: `DealTeamContact | null` (typ z `@/types/dealTeam`).
- `staleTime: 60_000`. Drugi klik w ten sam kontakt = cache hit, 0 requestów.

### 2. AgendaList — wiersze klikalne
- Zmiana: zamiast `<Link to={/contacts/...}>` w nazwisku, cały `Card` dostaje `role="button"`, `tabIndex={0}`, `cursor-pointer`, `hover:bg-muted/40` (już jest), `onClick={() => onSelect(row)}`, `onKeyDown` dla Enter/Space.
- Nazwa kontaktu przestaje być linkiem (link „Otwórz pełną kartę" już jest w samym Sheet).
- Nowy prop: `onSelect: (row: OdprawaAgendaRow) => void`.

### 3. SGUOdprawa.tsx
- State: `const [selectedAgendaRow, setSelectedAgendaRow] = useState<OdprawaAgendaRow | null>(null);`
- Wywołanie hooka: `const sheetContactQ = useDealTeamContactByContactId(selectedAgendaRow?.contact_id ?? null, teamId);`
- Przekaz do `<AgendaList rows={agenda} isLoading={agendaQ.isLoading} onSelect={setSelectedAgendaRow} />`
- Render Sheeta na końcu strony:
  - `contact={sheetContactQ.data ?? null}`
  - `teamId={teamId}`
  - `open={!!selectedAgendaRow && sheetContactQ.isSuccess && !!sheetContactQ.data}`
  - `onOpenChange={(open) => { if (!open) setSelectedAgendaRow(null); }}`
- Loading UX: gdy `selectedAgendaRow && sheetContactQ.isFetching && !sheetContactQ.data` → Sheet zostaje zamknięty (próg subiektywny, fetch zwykle <300ms na cache).
- Error UX: `useEffect` wokół `sheetContactQ.error` → `toast.error('Nie udało się wczytać kontaktu')` + `setSelectedAgendaRow(null)`.

## Co NIE robimy
- Brak zmian w `get_odprawa_agenda` (RPC i typy).
- Brak zmian w `ContactTasksSheet.tsx` ani w `useTeamContact`.
- Brak zmian w schemacie DB.
- Snapshot agendy w `odprawa_sessions.agenda_snapshot` zostaje zamrożony (po Start) — Sheet pokazuje **live** dane, intencjonalnie.

## QA po deploy (smoke Remka)
1. `/sgu/odprawa` → kliknij dowolny wiersz agendy → otwiera się Sheet z kontaktem + zakładkami zadań/notatek.
2. Drugi klik w ten sam wiersz po zamknięciu → otwiera natychmiast (cache).
3. Klik w inny wiersz → fetch → Sheet z innymi danymi.
4. Z otwartą sesją (Startuj odprawę) → klikalność dalej działa.

Czekam na GO/NO GO.

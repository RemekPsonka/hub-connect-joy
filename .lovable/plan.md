

# Plan: Tabela deal_team_contacts + triggery + indeksy

## Cel
Utworzenie głównej tabeli operacyjnej modułu "Zespół Deals" - `deal_team_contacts` - przechowującej kontakty CRM przypisane do zespołów dealowych z kategoryzacją HOT/TOP/LEAD.

## Stan obecny
- Tabela `deal_team_contacts` **nie istnieje** - będzie utworzona
- Funkcja `is_deal_team_member(p_team_id)` **istnieje** - gotowa do użycia w RLS
- Tabele `deal_teams` i `deal_team_members` **istnieją** z promptu 5.1

## Jedna migracja SQL

### Tabela `deal_team_contacts`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | Identyfikator |
| `team_id` | UUID NOT NULL | FK logiczne → deal_teams |
| `contact_id` | UUID NOT NULL | FK logiczne → contacts |
| `tenant_id` | UUID NOT NULL | Izolacja multi-tenant |
| `category` | TEXT | 'hot' / 'top' / 'lead' |
| `status` | TEXT | 'active' / 'on_hold' / 'won' / 'lost' / 'disqualified' |
| `assigned_to` | UUID | FK logiczne → directors |
| `priority` | TEXT | 'low' / 'medium' / 'high' / 'urgent' |
| `next_meeting_date` | TIMESTAMPTZ | Data spotkania |
| `next_meeting_with` | UUID | Kto idzie na spotkanie |
| `next_action` | TEXT | Opis następnej akcji |
| `next_action_date` | DATE | Termin akcji |
| `next_action_owner` | UUID | Kto ma wykonać |
| `deal_id` | UUID | Opcjonalne powiązanie z deal |
| `estimated_value` | NUMERIC | Szacowana wartość |
| `value_currency` | TEXT | Waluta (domyślnie PLN) |
| `notes` | TEXT | Notatki |
| `last_status_update` | TIMESTAMPTZ | Ostatni status cotygodniowy |
| `status_overdue` | BOOLEAN GENERATED | Auto: true gdy >7 dni bez statusu |
| `category_changed_at` | TIMESTAMPTZ | Kiedy zmieniono kategorię |
| `created_at` | TIMESTAMPTZ | Data utworzenia |
| `updated_at` | TIMESTAMPTZ | Data modyfikacji (trigger) |

**UNIQUE constraint**: `(team_id, contact_id)` - kontakt tylko raz w zespole

### Polityki RLS
Dostęp tylko dla członków zespołu (nie tylko tenant):

```sql
-- SELECT, INSERT, UPDATE, DELETE
USING (
  tenant_id = get_current_tenant_id()
  AND is_deal_team_member(team_id)
)
```

### Trigger
`trg_dtc_updated` - automatycznie aktualizuje `updated_at` przy UPDATE

### Indeksy

| Indeks | Kolumny | Cel |
|--------|---------|-----|
| `idx_dtc_team_category` | (team_id, category) | Kanban kolumny |
| `idx_dtc_team_assigned` | (team_id, assigned_to) | Filtr po osobie |
| `idx_dtc_status_overdue` | (team_id) WHERE status_overdue | Przeterminowane |
| `idx_dtc_next_meeting` | (next_meeting_date) WHERE NOT NULL | Kalendarz |
| `idx_dtc_contact` | (contact_id) | Lookup kontaktu |

## Szczegóły techniczne

### Kolumna GENERATED
```sql
status_overdue BOOLEAN GENERATED ALWAYS AS (
  last_status_update IS NULL
  OR last_status_update < NOW() - INTERVAL '7 days'
) STORED
```
Automatycznie obliczana przy każdym odczycie - nie wymaga aktualizacji przez aplikację.

### Struktura danych w Kanban

```text
┌─────────────────────────────────────────────────────────────┐
│  deal_team_contacts                                         │
│  ├── HOT (category='hot')    → Gorące szanse               │
│  ├── TOP (category='top')    → Wysoki priorytet            │
│  └── LEAD (category='lead')  → Do rozwinięcia              │
└─────────────────────────────────────────────────────────────┘
```

## Pliki do modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| Migracja SQL | Nowa | CREATE TABLE + RLS + trigger + indeksy |

## Guardrails ✓
- NIE modyfikuję `deal_teams` ani `deal_team_members`
- NIE tworzę ponownie `is_deal_team_member()`
- NIE modyfikuję tabeli `contacts`
- NIE tworzę komponentów React
- Kolumna `status_overdue` jako GENERATED ALWAYS AS ... STORED
- FK logiczne bez FOREIGN KEY constraints


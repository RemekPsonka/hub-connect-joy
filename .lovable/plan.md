

# Plan: Tabele deal_team_assignments + deal_team_activity_log + trigger kategorii

## Cel
Utworzenie ostatnich 2 tabel modułu "Zespół Deals" oraz triggera automatycznego logowania zmian kategorii. Po tej migracji baza danych modułu jest **KOMPLETNA (7/7 tabel)**.

## Stan obecny
- Tabele `deal_team_assignments`, `deal_team_activity_log` **nie istnieją** — będą utworzone
- Funkcje `is_deal_team_member()`, `get_current_director_id()` **istnieją** — gotowe do użycia
- Trigger `log_deal_category_change` **nie istnieje** — zostanie utworzony

## Jedna migracja SQL

### Tabela 1: `deal_team_assignments`

Lekkie zadania operacyjne przypisane do członków zespołu w kontekście kontaktu dealowego.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | Identyfikator |
| `team_contact_id` | UUID NOT NULL | FK → deal_team_contacts |
| `team_id` | UUID NOT NULL | FK → deal_teams |
| `tenant_id` | UUID NOT NULL | Izolacja multi-tenant |
| `assigned_to` | UUID NOT NULL | Kto ma wykonać |
| `assigned_by` | UUID NOT NULL | Kto zlecił |
| `title` | TEXT NOT NULL | Tytuł zadania |
| `description` | TEXT | Szczegóły |
| `due_date` | DATE | Termin wykonania |
| `status` | TEXT | 'pending' / 'in_progress' / 'done' / 'cancelled' |
| `priority` | TEXT | 'low' / 'medium' / 'high' / 'urgent' |
| `completed_at` | TIMESTAMPTZ | Data zakończenia |
| `created_at` | TIMESTAMPTZ | Data utworzenia |

### Tabela 2: `deal_team_activity_log`

Append-only log aktywności zespołu (bez UPDATE/DELETE).

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | Identyfikator |
| `team_id` | UUID NOT NULL | FK → deal_teams |
| `tenant_id` | UUID NOT NULL | Izolacja |
| `team_contact_id` | UUID | FK → deal_team_contacts (opcjonalne) |
| `prospect_id` | UUID | FK → deal_team_prospects (opcjonalne) |
| `actor_id` | UUID NOT NULL | Kto wykonał akcję |
| `action` | TEXT NOT NULL | Typ akcji |
| `old_value` | JSONB | Poprzednia wartość |
| `new_value` | JSONB | Nowa wartość |
| `note` | TEXT | Opcjonalna notatka |
| `created_at` | TIMESTAMPTZ | Data utworzenia |

**Dozwolone akcje**: `category_changed`, `status_changed`, `assigned`, `meeting_scheduled`, `weekly_status`, `prospect_converted`, `note_added`, `assignment_created`, `assignment_completed`, `contact_added`, `contact_removed`, `prospect_created`

### Polityki RLS

**deal_team_assignments** — pełny CRUD dla członków zespołu:
```sql
USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id))
```

**deal_team_activity_log** — tylko SELECT i INSERT (append-only):
```sql
-- SELECT: członek zespołu
-- INSERT: członek zespołu
-- BRAK UPDATE/DELETE — log niezmienny
```

### Trigger: `log_deal_category_change`

Automatycznie loguje zmianę kategorii w `deal_team_contacts`:

```sql
IF OLD.category IS DISTINCT FROM NEW.category THEN
  1. INSERT INTO deal_team_activity_log (action='category_changed')
  2. NEW.category_changed_at = now()
END IF
```

### Indeksy

| Tabela | Indeks | Kolumny | Cel |
|--------|--------|---------|-----|
| assignments | `idx_dta_assigned` | (assigned_to, status) | Moje zadania |
| assignments | `idx_dta_contact` | (team_contact_id) | Zadania kontaktu |
| assignments | `idx_dta_team_pending` | (team_id) WHERE status IN (...) | Otwarte w zespole |
| activity_log | `idx_dtal_team` | (team_id, created_at DESC) | Historia zespołu |
| activity_log | `idx_dtal_contact` | (team_contact_id, created_at DESC) | Historia kontaktu |
| activity_log | `idx_dtal_prospect` | (prospect_id, created_at DESC) | Historia prospectu |

## Przepływ danych

```text
┌─────────────────────────────────────────────────────────────┐
│  deal_team_assignments                                      │
│  ├── Przypisanie: assigned_by → assigned_to                │
│  ├── Statusy: pending → in_progress → done                 │
│  └── Powiązane z: deal_team_contacts                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  deal_team_activity_log (append-only)                       │
│  ├── TRIGGER: UPDATE deal_team_contacts.category           │
│  │   → INSERT log + SET category_changed_at = now()        │
│  └── Ręczne INSERT z aplikacji dla innych akcji            │
└─────────────────────────────────────────────────────────────┘
```

## Kompletna struktura modułu (7 tabel)

```text
deal_teams                    ← Zespoły
deal_team_members             ← Członkowie zespołów
deal_team_contacts            ← Kontakty HOT/TOP/LEAD
deal_team_prospects           ← Poszukiwani (pre-CRM)
deal_team_weekly_statuses     ← Cotygodniowe raporty
deal_team_assignments         ← Zadania operacyjne (NOWA)
deal_team_activity_log        ← Log aktywności (NOWA)
```

## Pliki do modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| Migracja SQL | Nowa | 2 tabele + RLS + trigger + indeksy |

## Guardrails ✓
- NIE modyfikuję istniejących 5 tabel modułu
- NIE tworzę ponownie istniejących funkcji
- NIE tworzę komponentów React
- `deal_team_activity_log` jest append-only (brak UPDATE/DELETE policies)
- Trigger używa `IS DISTINCT FROM` (bezpieczne dla NULL)
- FK logiczne bez FOREIGN KEY constraints


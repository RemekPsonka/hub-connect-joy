

# Plan: Tabele deal_team_prospects + deal_team_weekly_statuses

## Cel
Utworzenie dwóch nowych tabel dla modułu "Zespół Deals":
1. **deal_team_prospects** - poszukiwane osoby/firmy (mogą nie istnieć jeszcze w CRM)
2. **deal_team_weekly_statuses** - obowiązkowe cotygodniowe raporty dla HOT/TOP leadów

## Stan obecny
- Tabele `deal_team_prospects`, `deal_team_weekly_statuses` **nie istnieją** - będą utworzone
- Funkcja `is_deal_team_member()` **istnieje** - gotowa do użycia w RLS
- Funkcja `update_deal_team_timestamp()` **nie istnieje** - trzeba utworzyć (generyczna dla prospects)
- Tabela `deal_team_contacts` ma kolumnę `last_status_update` - trigger po INSERT statusu ją zaktualizuje

## Jedna migracja SQL

### Tabela 1: `deal_team_prospects`

Poszukiwane kontakty/firmy z danymi (nazwa, firma, stanowisko, LinkedIn) — osoba może nie istnieć jeszcze w CRM.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | Identyfikator |
| `team_id` | UUID NOT NULL | FK logiczne → deal_teams |
| `tenant_id` | UUID NOT NULL | Izolacja multi-tenant |
| `prospect_name` | TEXT NOT NULL | Imię/nazwisko lub nazwa firmy |
| `prospect_company` | TEXT | Firma (jeśli szukamy osoby) |
| `prospect_position` | TEXT | Stanowisko |
| `prospect_linkedin` | TEXT | URL LinkedIn |
| `prospect_email` | TEXT | Email |
| `prospect_phone` | TEXT | Telefon |
| `prospect_notes` | TEXT | Dodatkowe info |
| `contact_id` | UUID | FK → contacts (opcjonalne, po znalezieniu) |
| `company_id` | UUID | FK → companies (opcjonalne) |
| `requested_by` | UUID NOT NULL | Kto potrzebuje tego kontaktu |
| `requested_for_reason` | TEXT | Dlaczego szukamy |
| `assigned_to` | UUID | Kto aktywnie szuka |
| `status` | TEXT | 'searching' / 'found_connection' / 'intro_sent' / 'meeting_scheduled' / 'converted' / 'cancelled' |
| `found_via` | TEXT | Jak znaleziono drogę |
| `intro_contact_id` | UUID | Kto może wprowadzić |
| `priority` | TEXT | 'low' / 'medium' / 'high' / 'urgent' |
| `target_date` | DATE | Do kiedy chcemy dotrzeć |
| `converted_to_contact_id` | UUID | Po konwersji → deal_team_contacts |
| `created_at` | TIMESTAMPTZ | Data utworzenia |
| `updated_at` | TIMESTAMPTZ | Data modyfikacji |

### Tabela 2: `deal_team_weekly_statuses`

Cotygodniowe obowiązkowe statusy dla kontaktów HOT i TOP.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | Identyfikator |
| `team_contact_id` | UUID NOT NULL | FK → deal_team_contacts |
| `team_id` | UUID NOT NULL | FK → deal_teams |
| `tenant_id` | UUID NOT NULL | Izolacja |
| `reported_by` | UUID NOT NULL | Kto raportuje |
| `week_start` | DATE NOT NULL | Poniedziałek tygodnia |
| `status_summary` | TEXT NOT NULL | Co się wydarzyło |
| `next_steps` | TEXT | Co dalej |
| `blockers` | TEXT | Co blokuje |
| `meeting_happened` | BOOLEAN | Czy było spotkanie |
| `meeting_outcome` | TEXT | Wynik spotkania |
| `category_recommendation` | TEXT | 'keep' / 'promote' / 'demote' / 'close_won' / 'close_lost' |
| `created_at` | TIMESTAMPTZ | Data utworzenia |

**UNIQUE constraint**: `(team_contact_id, week_start)` - jeden status na kontakt na tydzień

### Polityki RLS

**deal_team_prospects** - dostęp dla członków zespołu:
```sql
USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id))
```

**deal_team_weekly_statuses** - SELECT/INSERT dla członków, UPDATE/DELETE tylko dla autora:
```sql
-- SELECT/INSERT: członek zespołu
-- UPDATE/DELETE: reported_by = get_current_director_id()
```

### Triggery

1. **update_deal_team_timestamp()** - nowa generyczna funkcja do auto-update `updated_at`
2. **trg_dtp_updated** - trigger na prospects
3. **update_last_status_on_weekly()** - funkcja aktualizująca `last_status_update` w contacts
4. **trg_dtws_update** - trigger AFTER INSERT na weekly_statuses

### Indeksy

| Tabela | Indeks | Kolumny | Cel |
|--------|--------|---------|-----|
| prospects | `idx_dtp_team_status` | (team_id, status) | Filtrowanie |
| prospects | `idx_dtp_assigned` | (assigned_to) | Moje zadania |
| prospects | `idx_dtp_requested` | (requested_by) | Moje prośby |
| statuses | `idx_dtws_team_week` | (team_id, week_start DESC) | Historia zespołu |
| statuses | `idx_dtws_contact` | (team_contact_id, week_start DESC) | Historia kontaktu |

## Przepływ danych

```text
┌─────────────────────────────────────────────────────────────┐
│  deal_team_prospects                                        │
│  ├── status: searching → found_connection → ...            │
│  └── Po konwersji → deal_team_contacts (LEAD)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  deal_team_weekly_statuses                                  │
│  ├── AFTER INSERT → trigger                                │
│  └── UPDATE deal_team_contacts.last_status_update = now()  │
│      → status_overdue = false (trigger przelicza)          │
└─────────────────────────────────────────────────────────────┘
```

## Pliki do modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| Migracja SQL | Nowa | 2 tabele + RLS + triggery + indeksy |

## Guardrails ✓
- NIE modyfikuję `deal_teams`, `deal_team_members`, `deal_team_contacts`
- NIE tworzę ponownie `is_deal_team_member()`
- NIE tworzę komponentów React
- Polityka UPDATE/DELETE na statuses ograniczona do `reported_by = self`
- FK logiczne bez FOREIGN KEY constraints


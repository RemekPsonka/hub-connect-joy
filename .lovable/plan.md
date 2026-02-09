

# Wanted Contacts -- Elastyczna Baza Poszukiwanych (Osoba i/lub Firma)

## Podsumowanie

Centralna baza poszukiwanych z elastycznym formularzem:
- **Tylko osoba**: "znany lekarz, prof. Kowalski" (bez firmy)
- **Tylko firma**: "szef logistyki z firmy ABC, NIP 123456" (bez konkretnej osoby)
- **Osoba + firma**: "Krzysztof Kowalski, CEO firmy ABC"
- Dodatkowe pola tekstowe do opisu kontekstu
- Widocznosc: creator-only + udostepnianie per dyrektor/zespol
- AI podpowiada kontakty z CRM z tej samej branzy

## Zmiana vs. poprzedni plan

Jedyna roznica to elastycznosc formularza:

| Pole | Poprzednio | Teraz |
|------|-----------|-------|
| `person_name` | NOT NULL (wymagane) | NULLABLE (opcjonalne) |
| `company_name` | opcjonalne | opcjonalne |
| Walidacja | osoba wymagana | przynajmniej jedno: person_name LUB company_name |
| `person_context` | brak | NOWE -- dodatkowy opis osoby ("znany lekarz", "ekspert od AI") |
| `company_context` | brak | NOWE -- opis firmy/roli ("szef logistyki", "ktos z zarzadu") |
| `search_context` | brak | NOWE -- dlaczego szukamy, dodatkowe informacje |

## Architektura bazy danych

### Tabela `wanted_contacts`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| tenant_id | UUID NOT NULL FK | |
| requested_by_contact_id | UUID NOT NULL FK → contacts | Kto szuka |
| **person_name** | TEXT (nullable) | Imie i nazwisko (opcjonalne) |
| person_position | TEXT | Stanowisko |
| person_email | TEXT | Email |
| person_phone | TEXT | Telefon |
| person_linkedin | TEXT | LinkedIn |
| **person_context** | TEXT | Opis osoby: "znany lekarz", "ekspert od AI" |
| **company_name** | TEXT (nullable) | Nazwa firmy (opcjonalne) |
| company_nip | TEXT | NIP |
| company_regon | TEXT | REGON |
| company_industry | TEXT | Branza |
| company_id | UUID FK → companies | Jesli firma istnieje |
| **company_context** | TEXT | Opis roli w firmie: "szef logistyki", "ktos z zarzadu" |
| **search_context** | TEXT | Dlaczego szukamy, dodatkowy kontekst |
| description | TEXT | Ogolny opis |
| urgency | TEXT DEFAULT 'normal' | low/normal/high/critical |
| status | TEXT DEFAULT 'active' | active/in_progress/fulfilled/cancelled |
| matched_contact_id | UUID FK → contacts | Znaleziona osoba |
| matched_by | UUID FK → directors | |
| matched_at | TIMESTAMPTZ | |
| created_by | UUID FK → directors | |
| notes | TEXT | Notatki wewnetrzne |
| created_at / updated_at / fulfilled_at | TIMESTAMPTZ | |

Walidacja triggerem: `person_name IS NOT NULL OR company_name IS NOT NULL` (przynajmniej jedno).

### Tabela `wanted_contact_shares`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| wanted_contact_id | UUID FK → wanted_contacts ON DELETE CASCADE | |
| shared_with_director_id | UUID FK → directors (nullable) | |
| shared_with_team_id | UUID FK → deal_teams (nullable) | |
| shared_by_director_id | UUID FK → directors | |
| permission | TEXT DEFAULT 'read' | read / write |
| created_at | TIMESTAMPTZ | |

Walidacja triggerem: albo director albo team musi byc NOT NULL.

### RLS

Funkcja `can_access_wanted_contact(wanted_id UUID)`:
- admin tenanta → true
- `created_by = get_current_director_id()` → true
- bezposrednie udostepnienie w `wanted_contact_shares` → true
- udostepnienie przez zespol (shares.team_id + deal_team_members.director_id) → true

Polityki:
- SELECT: `can_access_wanted_contact(id)`
- INSERT: `created_by = get_current_director_id()`
- UPDATE/DELETE: `created_by = get_current_director_id() OR is_tenant_admin()`

## Formularz tworzenia (WantedContactModal)

Elastyczny formularz z dwoma sekcjami:

**Sekcja 1: Kto szuka** (wymagane)
- ConnectionContactSelect

**Sekcja 2: Kogo szukamy** (przynajmniej jedno wypelnione)
- Zakladki lub sekcje: "Osoba" / "Firma"
- **Osoba** (opcjonalna):
  - Imie i nazwisko
  - Stanowisko
  - Opis osoby (textarea, placeholder: "np. znany lekarz, ekspert od AI...")
  - Email / Telefon / LinkedIn
- **Firma** (opcjonalna):
  - Nazwa firmy
  - NIP (auto-lookup) / REGON
  - Branza
  - Opis roli w firmie (textarea, placeholder: "np. szef logistyki, ktos z zarzadu...")

**Sekcja 3: Dodatkowe**
- Kontekst poszukiwania (textarea: "dlaczego szukamy, co chcemy osiagnac")
- Pilnosc (select)
- Notatki wewnetrzne

## Karta (WantedContactCard)

Dynamiczny wyglad:
- Jesli osoba: **bold imie** + opis osoby
- Jesli firma: **firma** + NIP + branza + opis roli
- Jesli oba: **imie** z firmy **firma**
- Kto szuka (link)
- Urgency/status badge
- Przycisk "Znam te osobe!" + "Udostepnij"
- AI sugestie (ta sama branza)

## Pliki do utworzenia

| Plik | Opis |
|------|------|
| Migracja SQL | Tabele + RLS + triggery walidacyjne + can_access_wanted_contact |
| `src/hooks/useWantedContacts.ts` | CRUD + match + NIP lookup + AI sugestie + sharing |
| `src/pages/WantedContacts.tsx` | Strona glowna z filtrami i statystykami |
| `src/components/wanted/WantedContactModal.tsx` | Elastyczny formularz |
| `src/components/wanted/WantedContactCard.tsx` | Karta z dynamicznym wyswietlaniem |
| `src/components/wanted/MatchWantedDialog.tsx` | Dialog "Znam te osobe!" |
| `src/components/wanted/ShareWantedDialog.tsx` | Dialog udostepniania |
| `src/components/wanted/WantedAISuggestions.tsx` | AI sugestie z CRM |
| `src/components/contacts/ContactWantedTab.tsx` | Zakladka w ContactDetail |

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | "Poszukiwani" w crmItems (ikona Target) |
| `src/pages/ContactDetail.tsx` | Zakladka "Poszukiwani" |
| `src/App.tsx` | Route `/wanted` |

## Kolejnosc

```text
1. Migracja SQL (tabele + RLS + triggery + funkcja dostepu)
2. useWantedContacts.ts (hook z CRUD, match, NIP lookup, sharing)
3. WantedContactModal.tsx (elastyczny formularz)
4. WantedContactCard.tsx + WantedAISuggestions.tsx
5. MatchWantedDialog.tsx + ShareWantedDialog.tsx
6. WantedContacts.tsx (strona glowna)
7. ContactWantedTab.tsx
8. AppSidebar + ContactDetail + App.tsx (nawigacja)
```


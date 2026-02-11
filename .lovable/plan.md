
# Synchronizacja notatek i budowanie wiedzy o kliencie

## Zidentyfikowane problemy

### 1. Dwa oddzielne pola notatek -- brak synchronizacji
- `contacts.notes` -- notatki na karcie CRM kontaktu (ContactNotesPanel, ContactNotesTab)
- `deal_team_contacts.notes` -- notatki w popupie Kanban (DealContactDetailSheet)
- Te pola sa calkowicie niezalezne. Notatka wpisana w Kanbanie NIE pojawia sie na karcie kontaktu i odwrotnie.

### 2. Narzedzia AI czytaja TYLKO contacts.notes
Nastepujace edge functions korzystaja wylacznie z `contacts.notes`:
- `generate-contact-profile` -- "Notatki: contact.notes"
- `query-contact-agent` -- "Notatki: contact.notes"
- `initialize-contact-agent` -- "Notatki: contact.notes"
- `learn-contact-agent` -- "Notatki: contact.notes"
- `master-agent-query` -- contact.notes w wyszukiwaniu
- `sovra-chat` -- "Notatki: contact.notes"

Oznacza to, ze notatki wpisywane w module Deals (Kanban) sa NIEWIDOCZNE dla AI.

### 3. Dodatkowe zrodla notatek nieuwzglednione w karcie kontaktu
Istnieja notatki rozproszone po roznych tabelach, ktore dotycza klienta ale nie sa widoczne w jednym miejscu:
- `consultations.notes` -- notatki ze spotkan
- `one_on_one_meetings.notes` -- notatki z 1:1
- `task_comments` -- komentarze do zadan powiazanych z kontaktem
- `project_notes` -- notatki projektowe (powiazane z kontaktem przez project_contacts)
- `deals.notes` -- notatki do szansy sprzedazowej
- `companies.notes` -- notatki o firmie
- `deal_team_prospects.prospect_notes` -- notatki prospektowe
- `wanted_contacts.notes` -- notatki "poszukiwani"

## Plan zmian

### Etap 1: Synchronizacja deal_team_contacts.notes -> contacts.notes

W `DealContactDetailSheet.tsx` -- przy zapisie notatek do `deal_team_contacts`, ROWNOCZESNIE zapisujemy do `contacts.notes` (dopisujemy, nie nadpisujemy). Alternatywnie -- usuwamy osobne pole notes z deal_team_contacts i zamiast tego uzywamy contacts.notes (ale to wymaga zmiany wielu zapytan).

**Proponowane podejscie:** W DealContactDetailSheet notatki zapisuja sie bezposrednio do `contacts.notes` zamiast do `deal_team_contacts.notes`. Dzieki temu:
- Notatki z Kanbana sa widoczne na karcie CRM
- Narzedzia AI automatycznie je "widza"
- Zachowujemy jedno zrodlo prawdy

### Etap 2: Panel "Kompletna historia notatek" na karcie kontaktu

Na stronie ContactDetail (prawa kolumna), pod istniejacym panelem notatek, dodajemy sekcje "Pelna historia wiedzy" -- read-only agregatke ze wszystkich zrodel:

```text
[Notatki manualne -- edytowalne textarea jak dotad]
---
Zebrana wiedza (read-only):
  📅 Konsultacja 12 sty -- "Klient zainteresowany polisa D&O..."
  💬 Komentarz zadania "Przygotuj oferte" -- "Czeka na dane finansowe"
  📋 Status tygodniowy -- "Spotkanie przeszlo pozytywnie"
  📝 Notatka projektowa -- "Wymaga dodatkowej analizy ryzyk"
```

Komponent `ContactKnowledgeTimeline` -- pobiera dane z:
- `consultations` (notes, ai_summary) powiazane z contact_id
- `task_comments` z zadan powiazanych z kontaktem
- `deal_team_contacts` weekly statuses (status_summary)
- `project_notes` z projektow powiazanych z kontaktem
- `one_on_one_meetings` notes

### Etap 3: Wzbogacenie kontekstu AI

W edge functions dodajemy dodatkowe zrodla do kontekstu:
- `deal_team_contacts.notes` (jesli istnieja, dopoki nie przejdziemy w pelni na contacts.notes)
- `weekly_statuses.status_summary` -- ostatnie 3 statusy
- `task_comments` z otwartych zadan kontaktu (ostatnie 5)

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/DealContactDetailSheet.tsx` | Zmiana zapisu notatek: z deal_team_contacts.notes na contacts.notes |
| `src/pages/ContactDetail.tsx` | Dodanie komponentu ContactKnowledgeTimeline w prawej kolumnie |
| `src/components/contacts/ContactKnowledgeTimeline.tsx` | NOWY -- agregacja notatek z roznych zrodel |
| `src/hooks/useContactKnowledge.ts` | NOWY -- hook pobierajacy dane z wielu tabel |
| `supabase/functions/generate-contact-profile/index.ts` | Dodanie deal_team_contacts.notes + weekly_statuses do kontekstu |
| `supabase/functions/query-contact-agent/index.ts` | Dodanie weekly_statuses + task_comments do kontekstu |
| `supabase/functions/initialize-contact-agent/index.ts` | Dodanie deal_team_contacts.notes do kontekstu |
| `supabase/functions/learn-contact-agent/index.ts` | Dodanie weekly_statuses do kontekstu |

## Szczegoly techniczne

### Hook useContactKnowledge

```text
Zapytania rownolegle (Promise.all):
1. consultations -- WHERE contact_id, ORDER BY scheduled_at DESC, LIMIT 10
2. task_comments -- WHERE task_id IN (tasks WHERE contact_id), LIMIT 10
3. deal_team_contacts -- WHERE contact_id (weekly_statuses JOIN)
4. project_notes -- WHERE project_id IN (project_contacts WHERE contact_id)
5. one_on_one_meetings -- WHERE contact_id

Zwraca: KnowledgeEntry[] = { date, source, content, sourceLabel }
Posortowane chronologicznie (najnowsze na gorze)
```

### Zmiana w DealContactDetailSheet (notatki)

Zamiast `updateContact.mutate({ id: contact.id, teamId, notes })` na deal_team_contacts, wywolamy osobny import `useUpdateContact` z hooks/useContacts i zapiszemy do `contacts.notes` uzywajac `contact.contact_id`.

### Wzbogacenie edge functions

Kazda funkcja AI dostanie dodatkowy blok w prompcie:

```text
## NOTATKI Z PROCESU SPRZEDAZY
[deal_team_contacts.notes]

## OSTATNIE STATUSY TYGODNIOWE
- Tydzien 03.02: "Spotkanie umowione na piatek"
- Tydzien 27.01: "Czeka na decyzje zarzadu"

## KOMENTARZE DO ZADAN
- Zadanie "Przygotuj oferte": "Klient potrzebuje wariantu z AC"
```

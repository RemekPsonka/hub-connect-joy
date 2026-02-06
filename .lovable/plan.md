

# Powazania kalendarza z CRM + Widgety kalendarza

## Podsumowanie

Dwie czesci w jednym prompcie:
- **Czesc A**: Nowa tabela `gcal_event_links` i UI do wiazania eventow Google Calendar z taskami/kontaktami/projektami — w popoverze na /calendar, w TaskDetailSheet oraz w MeetingsTab kontaktu.
- **Czesc B**: Podmiana widgetow na Dashboard ("Nadchodzace spotkania" z prawdziwych eventow GCal) oraz ulepszenie sekcji "Spotkania dzis" na /my-day o timeline i badge "TERAZ".

## Co sie zmieni

| Zmiana | Plik |
|--------|------|
| Migracja SQL | Nowa tabela `gcal_event_links` z RLS |
| Nowy hook | `src/hooks/useGCalLinks.ts` — CRUD na powiazaniach + resolve nazw |
| Nowy komponent | `src/components/calendar/EventLinkSection.tsx` — sekcja powiazan w popoverze |
| Nowy komponent | `src/components/calendar/LinkSearchDialog.tsx` — CommandDialog do szukania task/contact/project |
| Modyfikacja | `src/components/calendar/CalendarEventPopover.tsx` — dodanie sekcji powiazan |
| Modyfikacja | `src/components/tasks/TaskDetailSheet.tsx` — nowa sekcja "Spotkania" po subtaskach |
| Modyfikacja | `src/components/contacts/MeetingsTab.tsx` — nowy tab "Google Calendar" z powiazanymi eventami |
| Modyfikacja | `src/pages/Dashboard.tsx` — widget "Nadchodzace spotkania" z prawdziwymi eventami GCal |
| Modyfikacja | `src/components/my-day/GCalTodayEvents.tsx` — timeline + badge "TERAZ" |

---

## Szczegoly techniczne

### 1. Migracja SQL — tabela `gcal_event_links`

Nowa tabela laczaca Google Calendar event ID (text) z encjami CRM (UUID):

```text
gcal_event_links
  - id: uuid PK (gen_random_uuid)
  - tenant_id: uuid NOT NULL FK -> tenants(id)
  - director_id: uuid NOT NULL FK -> directors(id)
  - gcal_event_id: text NOT NULL
  - gcal_calendar_id: text NOT NULL
  - linked_type: text NOT NULL CHECK ('task', 'contact', 'project')
  - linked_id: uuid NOT NULL
  - created_at: timestamptz DEFAULT now()
  - UNIQUE(tenant_id, gcal_event_id, linked_type, linked_id)
```

RLS policy "gcal_links_own" — FOR ALL USING tenant_id = get_current_tenant_id() AND director_id = get_current_director_id().

### 2. Hook `useGCalLinks.ts`

Cztery eksportowane hooki:

- **useEventLinks(gcalEventId)** — query `['gcal-links', gcalEventId]` z resolve nazw (join-like): po pobraniu linkow, wykonuje osobne zapytania do `tasks`, `contacts`, `projects` aby rozwiazac nazwy. Zwraca `{ links: { type, id, name, linkId }[], isLoading }`.

- **useCreateEventLink()** — mutation insert do `gcal_event_links` z tenant_id i director_id z kontekstu auth. onSuccess invaliduje `['gcal-links', eventId]` + toast.

- **useRemoveEventLink()** — mutation delete z `gcal_event_links` po id linku. onSuccess invaliduje cache + toast.

- **useLinkedEvents(linkedType, linkedId)** — query `['linked-events', linkedType, linkedId]` do gcal_event_links WHERE linked_type = linkedType AND linked_id = linkedId. Zwraca tablice `{ gcal_event_id, gcal_calendar_id, created_at }[]`. Gracefully zwraca `[]` jesli brak gcal_tokens (nie crashuje).

### 3. Komponent `EventLinkSection.tsx`

Wydzielona sekcja renderowana wewnatrz CalendarEventPopover, ale tylko dla eventow typu `gcal_event`:

- Uzywa `useEventLinks(eventId)` gdzie eventId to item.id z prefixem `gcal-` usunietym
- Lista istniejacych linkow: ikona (CheckSquare/User/FolderKanban) + nazwa (klikalna, nawiguje do detali) + przycisk X do usuniecia (z AlertDialog confirm)
- Przycisk "Dodaj powiazanie" otwiera `LinkSearchDialog`
- Separator nad sekcja
- Heading "Powiazania" w stylu text-xs uppercase tracking-wider

### 4. Komponent `LinkSearchDialog.tsx`

Mini-dialog do wyszukiwania encji CRM — wzorowany na istniejacym CommandPalette:

- Props: `{ open, onOpenChange, onSelect: (type, id) => void }`
- Trzy zakladki/grupy: Zadania, Kontakty, Projekty
- CommandDialog z CommandInput do szukania
- Debounced search (300ms) po tabeli tasks (ilike title), contacts (ilike full_name), projects (ilike name)
- Po wyborze: wywoluje onSelect(linkedType, linkedId) i zamyka dialog
- Limit 5 wynikow per typ

### 5. Modyfikacja CalendarEventPopover

Dodanie `<EventLinkSection>` pod istniejacymi akcjami (po Separator), tylko gdy `item.type === 'gcal_event'`. EventLinkSection otrzymuje item jako prop i samodzielnie parsuje gcal event ID.

### 6. Modyfikacja TaskDetailSheet

Po sekcji "Powiazane kontakty" (linia 309), przed Actions (linia 312):

- Nowa sekcja "Spotkania z kalendarza" (opcjonalna, tylko gdy gcalConnected)
- Uzywa `useLinkedEvents('task', task.id)` + `useGCalConnection()`
- Lista powiazanych eventow: data + nazwa
- Jesli brak: tekst "Brak powiazanych spotkan"
- Przycisk "Powiaz spotkanie" otwierajacy uproszczony dialog (lista ostatnich eventow z GCal)
- Sekcja nie renderuje sie w ogole jesli gcal nie jest podlaczony

### 7. Modyfikacja MeetingsTab

Dodanie nowego TabsTrigger "Google Calendar" w istniejacym Tabs:

- Nowy TabsContent "gcal" renderujacy liste eventow powiazanych z kontaktem
- Uzywa `useLinkedEvents('contact', contactId)` + `useGCalConnection()`
- Jesli gcal nie podlaczony: EmptyState z linkiem do /settings
- Jesli brak eventow: EmptyState "Brak powiazanych spotkan"
- Jesli sa: lista chronologiczna z data, godzina, tytulem, nazwa kalendarza
- Rozroznienie przeszle (text-muted-foreground) vs nadchodzace (text-foreground font-medium)

### 8. Dashboard widget — "Nadchodzace spotkania"

Modyfikacja istniejacej sekcji w Dashboard.tsx (linie 216-264, col-span-4 DataCard):

- Dodanie warunku: jesli `gcalConnected` — pobierz eventy z `useGCalEvents(now, endOfWeek)` i pokaz je zamiast konsultacji
- Jesli `!gcalConnected` — zachowaj istniejace konsultacje (fallback)
- Nowy layout eventu: blok data/godzina (bg-muted rounded px-2 py-1, dzien tygodnia + godzina) + kolorowy pasek + tytul + lokalizacja
- Max 5 eventow
- Footer "Zobacz kalendarz" nawigujacy do /calendar
- Import `useGCalConnection` i `useGCalEvents` z hooka

### 9. Ulepszenie GCalTodayEvents na /my-day

Modyfikacja `src/components/my-day/GCalTodayEvents.tsx`:

- Dodanie wizualnej linii timeline:
  - Kazdy event owiniety w relative div
  - Pionowa linia (before pseudo-element via Tailwind): `relative pl-8` na kontener, linia po lewej stronie laczaca eventy
  - Kropka (dot) przy kazdym evencie w kolorze kalendarza
  - Ostatni element bez linii koncowej

- Badge "TERAZ" na aktualnie trwajacym spotkaniu:
  - Warunek: `event.start.dateTime && event.end.dateTime && now >= parseISO(start) && now <= parseISO(end)`
  - Badge: text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400, z animate-pulse na kropce
  - Pulsujacy ring na docie: ring-2 ring-violet-300

- Po kliknieciu eventu: otwiera `CalendarEventPopover` (reuse z /calendar)
  - Wymaga mapowania GCalEvent -> CalendarItem (reuse gcalToItem z useCalendarData)
  - Popover otwiera sie na kliknietym evencie

## Bezpieczenstwo

- Tabela `gcal_event_links` zabezpieczona RLS — kazdy dyrektor widzi tylko swoje powiazania (tenant_id + director_id)
- Brak modyfikacji Edge Functions
- Tokeny Google nie sa ujawniane na froncie — hooki operuja tylko na metadanych (event ID, nazwy)

## Co NIE zostanie zmienione

- Edge Functions `gcal-auth` i `gcal-events` — bez zmian
- Hook `useGoogleCalendar.ts` — bez zmian (uzywany as-is)
- Hook `useCalendarData.ts` — bez zmian
- Strona `Calendar.tsx` — bez zmian (popover jest rozszerzany wewnetrznie)
- Komponenty `WeekView.tsx` i `MonthView.tsx` — bez zmian
- Strona `/my-day` (MyDay.tsx) — bez zmian (modyfikujemy tylko komponent GCalTodayEvents)
- Settings — bez zmian


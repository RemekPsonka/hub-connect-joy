

# Integracja Google Calendar — UI w Settings + Spotkania na /my-day

## Podsumowanie

Rozbudowujemy frontend o sekcje Google Calendar: nowy tab w Ustawieniach (podlaczanie konta, wybor kalendarzy) oraz sekcja "Spotkania dzis" na stronie /my-day. Backend wymaga drobnego rozszerzenia — dodanie akcji `list-calendars` do istniejącej Edge Function `gcal-events`.

## Co sie zmieni

| Zmiana | Plik |
|--------|------|
| Nowy typ | `src/types/calendar.ts` — interface GCalEvent + GCalCalendar |
| Nowy hook | `src/hooks/useGoogleCalendar.ts` — 6 hooków React Query |
| Nowy komponent | `src/components/settings/GoogleCalendarSettings.tsx` — sekcja UI |
| Modyfikacja | `src/pages/Settings.tsx` — nowy tab "Integracje" z komponentem GCal |
| Modyfikacja | `src/pages/MyDay.tsx` — sekcja "Spotkania dzis" w prawej kolumnie |
| Modyfikacja | `supabase/functions/gcal-events/index.ts` — akcja `list-calendars` |

## Szczegoly techniczne

### 1. Typy — `src/types/calendar.ts`

Nowy plik z interfejsami:

```text
GCalEvent {
  id, summary, description?, start, end, location?,
  calendar_id, calendar_name, color, htmlLink
}

GCalCalendar {
  id, summary, backgroundColor, accessRole, primary
}
```

### 2. Hook — `src/hooks/useGoogleCalendar.ts`

Sześć eksportowanych hooków, wszystkie oparte na React Query:

- **useGCalConnection()** — query do `gcal_tokens` (via supabase client z RLS), zwraca `isConnected`, `connectedEmail`, `selectedCalendars`
- **useGCalConnect()** — mutation wywolujaca `gcal-auth` z `action: 'get-auth-url'`, po sukcesie redirect na `auth_url`
- **useGCalDisconnect()** — mutation wywolujaca `gcal-auth` z `action: 'disconnect'`, po sukcesie invalidacja cache
- **useGCalCalendars()** — query do `gcal-events` z `action: 'list-calendars'`, enabled tylko gdy `isConnected`
- **useUpdateSelectedCalendars()** — mutation bezposrednio przez supabase client: `update gcal_tokens set selected_calendars = [...]`
- **useGCalEvents(timeMin, timeMax)** — query do `gcal-events` z `action: 'get-events'`, staleTime 5 min, enabled tylko gdy `isConnected`

### 3. Rozszerzenie Edge Function — `gcal-events`

Zmiana schematu Zod z pojedynczego obiektu na `z.discriminatedUnion('action', [...])`:

- `action: 'list-calendars'` — wywoluje Google Calendar API `GET /users/me/calendarList`, zwraca tablice kalendarzy z `id`, `summary`, `backgroundColor`, `accessRole`, `primary`
- `action: 'get-events'` — dotychczasowa logika pobierania eventow (bez zmian w dzialaniu)

Zmiana metody HTTP: aktualnie funkcja wymaga POST. Po zmianie bedzie nadal POST, ale z polem `action` rozrozniacjacym operacje.

### 4. Komponent — `GoogleCalendarSettings.tsx`

Dwa stany UI:

**A) Niepodlaczony:**
- Ikona kalendarza + tytul "Polacz Google Calendar"
- Opis: "Synchronizuj spotkania i wydarzenia z kalendarza Google"
- Przycisk "Polacz konto Google" (wywoluje `useGCalConnect`)
- Notka o wymaganych uprawnieniach (tylko odczyt)

**B) Podlaczony:**
- Naglowek: email + badge "Polaczono" (emerald) + przycisk "Rozlacz" z dialogiem potwierdzenia
- Lista kalendarzy z checkboxami (dane z `useGCalCalendars`):
  - Kolor dot (backgroundColor z Google API)
  - Nazwa kalendarza
  - Badge roli (Wlasciciel / Tylko odczyt)
  - Badge "Glowny" dla primary
- Przycisk "Zapisz wybor" (wywoluje `useUpdateSelectedCalendars`)

### 5. Modyfikacja Settings.tsx

- Dodanie nowego taba "Integracje" z ikona Calendar w TabsList (po istniejacych tabach)
- TabsContent renderuje `<GoogleCalendarSettings />`
- useEffect na URL param `?gcal=connected` -> toast sukcesu + czyszczenie URL
- useEffect na `?gcal=error` -> toast bledu

### 6. Modyfikacja MyDay.tsx

W prawej kolumnie (lg:col-span-4), miedzy mini kalendarzem a "Moje projekty":

- Import `useGCalConnection` i `useGCalEvents`
- Nowa DataCard "Spotkania dzis" z lista eventow:
  - Kazdy event: godzina (HH:mm) + kolorowy pasek + tytul + lokalizacja + czas trwania
  - Posortowane chronologicznie
- Trzy stany:
  - Eventy sa -> lista chronologiczna
  - Brak eventow -> EmptyState "Spokojny dzien!"
  - Brak polaczenia -> EmptyState z linkiem do /settings (tab integracje)

## Bezpieczenstwo

- Tokeny Google **nigdy nie trafiaja do frontendu** — hook `useGCalConnection` odpytuje tylko o `connected_email`, `selected_calendars` i fakt istnienia wiersza
- `useGCalEvents` i `useGCalCalendars` komunikuja sie wylacznie przez Edge Functions
- RLS na tabeli `gcal_tokens` ogranicza dostep do wlasnego wiersza dyrektora
- Update `selected_calendars` odbywa sie przez supabase client z tokenem usera (RLS weryfikuje)

## Co NIE zostanie zmienione

- Edge Function `gcal-auth` — bez zmian
- Istniejace taby i sekcje w Settings — bez modyfikacji
- Hook `useMyDayData` — bez zmian (eventy GCal sa osobnym hookiem)
- Zadne inne strony ani komponenty


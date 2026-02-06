
# Strona Kalendarza — /calendar z widokiem tygodniowym i miesiecznym

## Podsumowanie

Tworzymy dedykowana strone kalendarza /calendar, ktora laczy eventy z Google Calendar i zadania CRM w jednym widoku. Dwa tryby: tygodniowy (domyslny, z siatka godzinowa) i miesieczny (grid dniowy). Calosc budowana z div/grid + CSS, bez zewnetrznych bibliotek kalendarza.

## Co sie zmieni

| Zmiana | Plik |
|--------|------|
| Nowy hook | `src/hooks/useCalendarData.ts` — merge GCal events + CRM tasks |
| Nowa strona | `src/pages/Calendar.tsx` — glowna strona kalendarza |
| Nowy komponent | `src/components/calendar/WeekView.tsx` — widok tygodniowy |
| Nowy komponent | `src/components/calendar/MonthView.tsx` — widok miesieczny |
| Nowy komponent | `src/components/calendar/CalendarEventPopover.tsx` — popover z detalami |
| Nowy komponent | `src/components/calendar/CalendarHeader.tsx` — nawigacja daty + przelacznik widoku |
| Nowy typ | `src/types/calendar.ts` — rozszerzenie o CalendarItem |
| Modyfikacja | `src/App.tsx` — lazy route /calendar z DirectorGuard |
| Modyfikacja | `src/components/layout/AppSidebar.tsx` — "Kalendarz" w grupie Overview |
| Modyfikacja | `src/components/layout/Breadcrumbs.tsx` — label 'calendar': 'Kalendarz' |

## Szczegoly techniczne

### 1. Typ CalendarItem — rozszerzenie `src/types/calendar.ts`

Nowy interface dodany do istniejacego pliku:

```text
CalendarItem {
  id: string
  title: string
  start: Date
  end: Date
  type: 'gcal_event' | 'crm_task'
  color: string           // gcal: calendar color, task: priority color
  allDay: boolean
  location?: string       // tylko gcal
  status?: string         // tylko task
  htmlLink?: string       // tylko gcal
  calendarName?: string   // tylko gcal
  projectName?: string    // tylko task
}
```

### 2. Hook useCalendarData

Props: `{ view: 'week' | 'month', currentDate: Date }`

Logika:
- Oblicza timeMin/timeMax na podstawie view + currentDate (week: pon-ndz, month: 1-ostatni dzien)
- Pobiera rownolegle: `useGCalEvents(timeMin, timeMax)` + query do tabeli `tasks` (WHERE due_date BETWEEN timeMin AND timeMax)
- Mapuje GCalEvent na CalendarItem (type='gcal_event', color z kalendarza)
- Mapuje tasks na CalendarItem (type='crm_task', color wg priorytetu: urgent=red, high=amber, medium=blue, low=gray)
- Dla taskow bez godziny (due_date bez czasu) — ustawia allDay=true
- Merge obu tablic i sortuje po start Date
- Zwraca: `{ items: CalendarItem[], isLoading: boolean, gcalConnected: boolean }`

Hook dziala nawet bez Google Calendar — wtedy gcalConnected=false, items zawieraja tylko taski CRM.

### 3. CalendarHeader

Elementy:
- Lewo: h2 "Kalendarz" + badge z zakresem dat (np. "3-9 lut 2026" lub "luty 2026")
- Srodek: przyciski ChevronLeft / "Dzis" / ChevronRight — przesuwaja o tydzien lub miesiac
- Prawo: przelacznik widoku Tydzien | Miesiac (dwa przyciski z aktywnym stanem bg-primary text-white)

### 4. WeekView

Siatka 8 kolumn: 1 kolumna czasu (w-16) + 7 kolumn dni.

**Header (sticky):**
- Kazdy dzien: skrocona nazwa (Pon, Wt...) + numer, dzis podswietlony (bg-primary text-white, rounded-full)

**Time grid:**
- Godziny 7:00-21:00, kazda godzina = 64px wysokosci
- Lewa kolumna: etykiety godzin (text-xs text-muted-foreground)

**Event positioning:**
- Kazdy event pozycjonowany absolutnie: top = (startHour - 7) * 64px, height = durationMinutes * (64/60)px, min-height 24px
- gcal_event: tlo z kolorem kalendarza (opacity 20%), border-left-3 z pelnym kolorem
- crm_task: tlo bg-violet-50, border-left-3 border-violet-500
- Zawartosc: tytul (font-medium, truncate) + godzina (text-xs, muted)

**Overlapping events:**
- Grupowanie eventow po przedzialach czasowych: jesli dwa+ eventy nachodza na siebie, kazdy dostaje width = 100/n % i jest przesuniety w lewo o swoj indeks * (100/n)%

**All-day events:**
- Osobny rzad nad siatka godzinowa, kazdy jako inline-block z tlem koloru i truncated tytul

**Current time indicator:**
- Czerwona linia na dzisiejszej kolumnie, pozycja obliczana z aktualnej godziny
- Aktualizacja co minute (setInterval z cleanup)
- Kropka na lewym koncu linii

**Auto-scroll:**
- useEffect na mount: scrollTo tak zeby godzina 8:00 byla widoczna

### 5. MonthView

Grid 7 kolumn (Pon-Ndz) x 5-6 wierszy.

**Header:** etykiety dni tygodnia (Pon, Wt, Sr...) uppercase, text-xs.

**Komorka dnia:**
- min-h-[100px], border, padding 4px
- Numer dnia: text-sm, dzis podswietlony (bg-primary text-white, rounded-full w-6 h-6)
- Dni spoza miesiaca: text-muted-foreground/30, bg-muted/20
- Max 3 eventy widoczne, kazdy jako truncate text-xs z tlem koloru
- "+N wiecej" jesli jest wiecej niz 3

**Drill-down:** klik na dzien przelacza na widok tygodniowy z tym dniem

### 6. CalendarEventPopover

Shadcn Popover, wyswietlany po kliknieciu na event.

Zawartosc:
- Kolorowy pasek u gory (h-1, kolor eventu)
- Tytul (font-semibold)
- Czas (Clock icon + "09:30 - 10:30")
- Lokalizacja (MapPin icon, jesli jest)
- Nazwa kalendarza (CalendarDays icon, jesli gcal)
- Projekt (FolderOpen icon + badge, jesli task)
- Status (badge color-coded, jesli task)
- Divider
- Akcje:
  - gcal: "Otworz w Google Calendar" → window.open(htmlLink, '_blank')
  - task: "Otworz zadanie" → navigate(/tasks) lub link

### 7. Calendar.tsx (strona)

Stan:
- `view: 'week' | 'month'` — domyslnie 'week'
- `currentDate: Date` — domyslnie new Date()

Layout:
- Banner "Polacz Google Calendar" (jesli !gcalConnected): bg-blue-50 border-blue-200, z linkiem do /settings?tab=integrations
- CalendarHeader z nawigacja i przelacznikiem
- WeekView lub MonthView w zaleznosci od stanu view
- Loading: skeleton grid z pulse blocks

### 8. Routing i nawigacja

**App.tsx:**
- Lazy import: `const Calendar = lazy(() => import("./pages/Calendar"))`
- Route: `<Route path="/calendar" element={<DirectorGuard><Calendar /></DirectorGuard>} />`

**AppSidebar.tsx:**
- Import `CalendarDays` z lucide-react
- Dodaj do `overviewItems`: `{ title: 'Kalendarz', url: '/calendar', icon: CalendarDays }`

**Breadcrumbs.tsx:**
- Dodaj: `'calendar': 'Kalendarz'` do routeLabels

## Co NIE zostanie zmienione

- Strona /my-day — bez zmian
- Strona Settings — bez zmian
- Edge Functions — bez zmian
- Hook useGoogleCalendar — bez zmian (uzywany as-is)
- Hook useMyDayData — bez zmian
- Zadne istniejace komponenty

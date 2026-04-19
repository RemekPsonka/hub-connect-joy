# ADR 0018 — Scalenie spotkań i konsultacji

Data: 2026-04-19
Status: Zaakceptowane (Sprint 18, etap 1/2)

## Kontekst

Aplikacja ma równolegle dwie domeny „spotkań":

- `consultations` (+ 6 tabel-dzieci: `consultation_chat_messages`, `consultation_guests`,
  `consultation_questionnaire`, `consultation_recommendations`, `consultation_thanks`,
  `consultation_meetings`) oraz FK z `tasks.consultation_id` i 2 triggery.
- `group_meetings` z `meeting_participants` (FK + realtime publication) oraz
  `one_on_one_meetings` (sub-tabela rejestrująca pary osób w trakcie spotkania grupowego —
  to NIE są samoistne 1:1, tylko wynik networkingu w obrębie grupy).

Pierwotny plan zakładał scalenie do jednej tabeli `meetings` w jednym sprincie wraz
z RENAME-ami i migracją child tables do JSONB. Audyt wykazał:

1. `one_on_one_meetings` semantycznie należy do `group_meetings`. Backfill jako samoistne
   spotkania zniszczyłby tę relację.
2. `meeting_participants` już istnieje — utworzenie nowej tabeli o tej samej nazwie
   spowodowałoby kolizję nazwy.
3. ~59 plików referuje stare tabele/hooki (Dashboard, Calendar, Notifications, ContactDetail,
   Sovra tools). Big-bang RENAME zostawiłby trasy `/consultations/:id` i FK wskazujące
   na `deprecated_*`, a UI dalej czytałby starą nazwę → wszystko padnie.
4. Dane są produkcyjne, ale ilościowo trywialne (1 konsultacja, 0 networking 1:1,
   2 spotkania grupowe). Stosunek ryzyka do zysku natychmiastowego scalenia był bardzo zły.

## Decyzja

Scalenie rozkładamy na **2 sprinty**:

### Sprint 18 (ten) — bridge view + ujednolicony FE

- Snapshoty 4 tabel źródłowych do schematu `archive` (read-only, zgodnie z policy).
- VIEW `public.unified_meetings` (`UNION ALL` konsultacji i spotkań grupowych)
  z `security_invoker = true` — RLS jest na tabelach źródłowych, więc widok automatycznie
  filtruje per tenant.
- Nowy hook `useUnifiedMeetings` + komponent `UnifiedMeetingsList`.
- Tabs „Wszystkie / Konsultacje / Grupowe" w `/meetings`. Klik w wierszu nawiguje
  do istniejących tras (`/consultations/:id` lub `/meetings/:id`).
- Tab „Wszystkie spotkania" w karcie kontaktu, obok istniejących Konsultacje/BI/GCal.
- Sovra: nowy read-only tool `search_meetings` operujący na VIEW.

### Sprint 19+ (deprecation) — fizyczna konsolidacja

- Migracja child tables konsultacji do JSONB `metadata` na nowej tabeli `meetings`.
- Migracja `tasks.consultation_id` → `tasks.meeting_id`.
- RENAME starych tabel na `deprecated_*` (z policy: rename najpierw, fizyczny DROP po ≥30 dniach).
- Usunięcie tras `/consultations/:id` i odwołań w UI.

## Konsekwencje

**Pozytywne**

- Zerowy blast-radius dla istniejących konsumentów `useMeetings` / consultations UI.
- Spójny UX (jedna lista spotkań) bez ryzyka utraty danych.
- VIEW służy jako kontrakt do dalszej migracji — gdy fizycznie scalimy, VIEW może być
  zastąpione bez zmian po stronie konsumentów.

**Negatywne / dług**

- Przez >30 dni mamy 2 tabele i jeden VIEW — duplikacja, którą trzeba pamiętać.
- Tworzenie spotkań przez UI dalej jest rozłączne (osobne modale).
- Sovra `create_meeting` tworzy tylko `group_meetings`. `create_consultation` jako tool
  do zaadresowania w Sprint 19, jeżeli zażądamy.

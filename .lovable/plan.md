
# Import listy z PDF do spotkania z pelna integracja z Prospecting

## Podsumowanie

Dodanie przycisku "Importuj z PDF" na ekranie spotkania (MeetingDetail), ktory wykorzystuje istniejacy modul `parse-meeting-list` (edge function + AI). Po parsowaniu listy uczestnikow, system:
1. Dopasowuje osoby do istniejacych kontaktow w ConnectHUB (po imieniu/nazwisku/firmie)
2. Rozpoznaje grupe kontaktowa (badge: Czlonek CC, Moj czlonek, Prospect)
3. Umozliwia edycje badge i usuniecie z listy przed importem
4. Importuje uczestnikow pod spotkanie (meeting_participants) -- istniejacy kontakci jako uczestnicy
5. Rownoczesnie dodaje osoby oznaczone jako "Prospect" do tabeli `meeting_prospects` wskazanego zespolu Deals z polem `source_event` = nazwa + data spotkania
6. Brief AI wygenerowany na prospekcie jest dostepny wszedzie -- na liscie prospektow, w spotkaniu i po konwersji

## Schemat dzialania

```text
PDF -> parse-meeting-list (AI) -> lista osob
  |
  v
Dopasowanie do contacts (full_name + company)
  |
  +-- Znaleziony w CH -> badge grupy kontaktowej -> meeting_participants
  +-- Nie znaleziony   -> badge "Prospect" -> meeting_participants + meeting_prospects (team)
  |
  v
Po spotkaniu:
  - Obecnosc (checkbox) -> meeting_participants.attendance_status
  - Notatki, 1x1 -> jak dotad
  - Prospekci -> widoczni w zespole Deals, ze zrodlem "Spotkanie CC 12.02.2026"
  - "Opracowane" -> archiwizacja spotkania -> dalsza praca w zespolach/CRM
```

## Zmiany w bazie danych

### Tabela `meeting_prospects` -- nowa kolumna
- `meeting_id UUID REFERENCES group_meetings(id)` -- powiazanie z konkretnym spotkaniem (opcjonalne, NULL jesli importowano recznie w zespole)

### Tabela `meeting_participants` -- nowa kolumna
- `prospect_id UUID REFERENCES meeting_prospects(id)` -- powiazanie uczestnika-prospekta z rekordem w meeting_prospects (umozliwia synchronizacje statusow)

## Nowe/modyfikowane pliki

### 1. `src/components/meetings/ImportPDFMeetingDialog.tsx` (NOWY)
Dialog importu PDF specyficzny dla spotkania. Reuse logiki z `ProspectingImportDialog`:

**Krok 1 -- Upload:** Identyczny z ProspectingImportDialog (upload PDF, parsowanie przez edge function)

**Krok 2 -- Podglad z dopasowaniem:**
- Dla kazdej osoby z PDF: zapytanie do `contacts` po `full_name` (case-insensitive ILIKE) i `company`
- Jesli znaleziono kontakt:
  - Wyswietl badge grupy kontaktowej (Czlonek CC / Moj czlonek) na podstawie `primary_group_id` i `director_id`
  - Participant bedzie dodany do `meeting_participants` z `contact_id`
- Jesli NIE znaleziono:
  - Badge "Prospect" (pomaranczowy)
  - Participant dodany do `meeting_participants` jako nowy kontakt + rekord w `meeting_prospects`

**Krok 2b -- Edycja przed importem:**
- Klikniecie na badge umozliwia zmiane: Czlonek CC / Moj czlonek / Prospect / Nowy kontakt
- Przycisk X usuwa osobe z listy
- Dropdown "Zespol Deals" -- wybor zespolu, do ktorego trafa prospekci

**Krok 3 -- Import:**
- Istniejacy kontakci -> `meeting_participants` insert
- Prospekci -> tworzony nowy kontakt (lub nie, jesli chcemy zachowac jako prospect) + `meeting_prospects` insert z `source_event` = "{nazwa spotkania} ({data})" i `meeting_id` = id spotkania + `meeting_participants` insert z `prospect_id`

### 2. `src/components/meetings/MeetingParticipantsTab.tsx` (MODYFIKACJA)
- Dodanie przycisku "Importuj z PDF" obok istniejacego "Importuj z CSV"
- Import komponentu `ImportPDFMeetingDialog`
- Przekazanie `meetingId` + `meetingName` + `meetingDate` do dialogu

### 3. `src/pages/MeetingDetail.tsx` (MODYFIKACJA)
- Przekazanie `meeting.name` i `meeting.scheduled_at` do `MeetingParticipantsTab` (potrzebne do nazwy source_event)

### 4. `src/components/meetings/MeetingParticipantsTab.tsx` -- rozszerzenie tabeli
- Dodanie kolumny "Brief AI" -- jesli uczestnik jest powiazany z `meeting_prospects` (prospect_id), wyswietl ikonke Sparkles z linkiem do briefu
- Klikniecie otwiera `ProspectAIBriefDialog` (ten sam komponent co w deals-team)

### 5. `src/hooks/useMeetingParticipantImport.ts` (NOWY)
Hook obslugujacy:
- Dopasowanie osob do kontaktow (`matchContactsFromParsed`)
- Masowy import uczestnikow + prospektow
- Zapytanie do `contacts` z filtrem po `tenant_id`

### 6. `src/components/meetings/ParticipantBadge.tsx` (MODYFIKACJA)
- Dodanie wariantu "Prospect" (pomaranczowy badge)

## Synchronizacja danych

### Prospekci w spotkaniu <-> Zespol Deals
- `meeting_prospects` jest wspolna tabela -- ten sam rekord widoczny jest w zespole Deals (ProspectingList) i w spotkaniu
- `source_event` = nazwa spotkania + data -- widoczne jako zrodlo w filtrze zrodel na liscie prospektow
- `meeting_id` -- pozwala na filtrowanie prospektow per spotkanie

### Brief AI -- jednolite zrodlo
- Brief przechowywany w `meeting_prospects.ai_brief`
- `ProspectAIBriefDialog` (juz istniejacy) dziala identycznie w obu miejscach
- Raz wygenerowany brief widoczny jest:
  - Na liscie Prospecting w zespole Deals
  - Na karcie uczestnika w spotkaniu (przez prospect_id -> meeting_prospects.ai_brief)
  - W eksporcie PDF (istniejaca funkcja `exportProspectBriefsPDF`)

### Eksport PDF z briefami
- Dodanie przycisku "Eksportuj briefy PDF" w MeetingParticipantsTab (dla uczestnikow z briefem AI)
- Reuse istniejacego `exportProspectBriefsPDF` z `src/utils/exportProspectBriefs.ts`

## Workflow uzytkowania

```text
PRZED SPOTKANIEM:
1. Tworze spotkanie (CC 12.02.2026)
2. Importuje liste z PDF -> system rozpoznaje kontakty i prospektow
3. Generuje briefy AI dla prospektow (ikona Sparkles)
4. Drukuje briefy do PDF

PO SPOTKANIU:
5. Zaznaczam obecnosc (checkbox)
6. Dodaje spotkania 1x1
7. Dodaje notatki
8. Prospekci automatycznie widoczni w zespole Deals z filtrem zrodla

OPRACOWANIE:
9. W zespole Deals -- konwertujem prospektow do kontaktow (istniejacy flow)
10. Dane synchronizuja sie z CRM (istniejacy flow)
11. Archiwizuje spotkanie -> dalsza praca w zespolach i na kartach
```

## Podsumowanie plikow

| Plik | Typ | Opis |
|---|---|---|
| Migracja SQL | nowa | Dodanie `meeting_id` do `meeting_prospects`, `prospect_id` do `meeting_participants` |
| `src/components/meetings/ImportPDFMeetingDialog.tsx` | nowy | Dialog importu PDF z dopasowaniem kontaktow |
| `src/hooks/useMeetingParticipantImport.ts` | nowy | Hook dopasowania i importu |
| `src/components/meetings/MeetingParticipantsTab.tsx` | zmiana | Przycisk PDF, kolumna Brief AI, eksport PDF |
| `src/pages/MeetingDetail.tsx` | zmiana | Przekazanie nazwy/daty spotkania |
| `src/components/meetings/ParticipantBadge.tsx` | zmiana | Wariant "Prospect" |

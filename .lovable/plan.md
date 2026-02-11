
# Naprawa prospektów: deduplikacja + wyświetlanie danych + klucze obce

## Problem

1. **Brak kluczy obcych** na tabeli `meeting_participants` -- PostgREST nie może wykonać joina z `meeting_prospects`, więc dane prospektów (imię, firma, branża) nie są pobierane i wyświetla się "Nieznany kontakt"
2. **Brak sprawdzania duplikatów** przy imporcie PDF -- jeśli prospect już istnieje w `meeting_prospects` (np. z poprzedniego spotkania), tworzony jest nowy rekord zamiast użycia istniejącego
3. **Brak sprawdzania w bazie kontaktów** przy użyciu `check-duplicate-contact` -- osoby które już są w CRM jako kontakty, powinny być rozpoznane i podlinkowane

## Rozwiązanie

### 1. Migracja bazy danych -- dodanie kluczy obcych

Dodanie brakujących foreign keys na `meeting_participants`:

```text
ALTER TABLE meeting_participants
  ADD CONSTRAINT fk_meeting_participants_contact
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE meeting_participants
  ADD CONSTRAINT fk_meeting_participants_prospect
  FOREIGN KEY (prospect_id) REFERENCES meeting_prospects(id) ON DELETE CASCADE;

ALTER TABLE meeting_participants
  ADD CONSTRAINT fk_meeting_participants_meeting
  FOREIGN KEY (meeting_id) REFERENCES group_meetings(id) ON DELETE CASCADE;
```

To umożliwi PostgREST join `prospect:meeting_prospects(...)` w zapytaniu.

### 2. Rozszerzenie `matchContactsFromParsed` w `useMeetingParticipantImport.ts`

Oprócz sprawdzania w tabeli `contacts`, sprawdzać też w `meeting_prospects`:

- Pobrać istniejących prospektów z `meeting_prospects` dla danego `tenant_id`
- Jeśli osoba z PDF pasuje do istniejącego prospekta (po imieniu/nazwisku) -- użyć tego prospekta zamiast tworzyć nowego
- Dodać nowy `matchType`: np. `'existing_prospect'` -- z `prospectId` wskazującym na istniejący rekord
- Wyświetlić dane istniejącego prospekta (firma, branża, AI brief) w podglądzie importu

### 3. Aktualizacja logiki importu w `useImportPDFParticipants`

- Dla osób dopasowanych do istniejącego prospekta -- NIE tworzyć nowego rekordu w `meeting_prospects`, tylko wstawić `meeting_participants` z `prospect_id` wskazującym na istniejący rekord
- Dla nowych prospektów -- zachować obecne zachowanie (insert do `meeting_prospects` + `meeting_participants`)

### 4. Aktualizacja UI w `ImportPDFMeetingDialog.tsx`

- Przy osobach dopasowanych do istniejącego prospekta -- wyświetlić badge "Prospect (w bazie)" + dane z istniejącego rekordu (firma, branża)
- Jeśli prospect ma `ai_brief` -- pokazać ikonkę informującą o dostępnym briefie AI
- Dodać przycisk "Wyszukaj w bazie" (korzystający z `ConnectionContactSelect`) dla prospektów, którzy mogą być już kontaktami w CRM ale nie zostali automatycznie dopasowani

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| Migracja SQL | Dodanie FK na `meeting_participants` (contact_id, prospect_id, meeting_id) |
| `src/hooks/useMeetingParticipantImport.ts` | Sprawdzanie duplikatów w `meeting_prospects`, nowy typ `existing_prospect`, logika reużycia |
| `src/components/meetings/ImportPDFMeetingDialog.tsx` | Badge "Prospect (w bazie)", dane istniejącego prospekta, przycisk "Wyszukaj w bazie" |

## Szczegóły techniczne

### matchContactsFromParsed -- rozszerzona logika

```text
// 1. Pobranie kontaktów (jak dotychczas)
const { data: contacts } = await supabase.from('contacts')...

// 2. NOWE: Pobranie istniejących prospektów
const { data: existingProspects } = await supabase
  .from('meeting_prospects')
  .select('id, full_name, company, position, industry, ai_brief, prospecting_status')
  .eq('tenant_id', tenantId)
  .limit(1000);

// 3. Dla każdej osoby: sprawdź kontakty -> sprawdź prospektów -> nowy prospect
return people.map((person) => {
  // Najpierw szukaj w contacts
  const contactMatch = contactList.find(...);
  if (contactMatch) return { matchType: 'member'/'cc_member', contactId: ... };

  // Potem szukaj w existing prospects
  const prospectMatch = existingProspects.find(
    p => p.full_name.toLowerCase().trim() === nameLower
  );
  if (prospectMatch) return {
    matchType: 'existing_prospect',
    prospectId: prospectMatch.id,
    contactFullName: prospectMatch.full_name,
    contactCompany: prospectMatch.company,
    hasAiBrief: !!prospectMatch.ai_brief,
    // ... dane prospekta
  };

  // Nowy prospect
  return { matchType: 'prospect' };
});
```

### MatchedParticipant -- rozszerzony interfejs

```text
export interface MatchedParticipant {
  parsed: ParsedPerson;
  matchType: 'member' | 'cc_member' | 'prospect' | 'existing_prospect';
  contactId?: string;
  prospectId?: string;         // NOWE: ID istniejącego prospekta
  contactFullName?: string;
  contactCompany?: string | null;
  primaryGroupId?: string | null;
  groupName?: string | null;
  hasAiBrief?: boolean;        // NOWE: czy ma brief AI
}
```

### Import -- logika reużycia prospektów

```text
// W useImportPDFParticipants:
const existingProspects = participants.filter(p => p.matchType === 'existing_prospect');
const newProspects = participants.filter(p => p.matchType === 'prospect');

// Istniejący prospekty -- tylko insert meeting_participants z prospect_id
if (existingProspects.length > 0) {
  const rows = existingProspects.map(p => ({
    meeting_id: meetingId,
    prospect_id: p.prospectId,
    is_member: false,
    is_new: false,
  }));
  await supabase.from('meeting_participants').insert(rows);
}

// Nowi prospekty -- insert meeting_prospects + meeting_participants (jak dotychczas)
```

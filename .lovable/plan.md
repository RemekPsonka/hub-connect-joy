
## Plan: RD-A1 hotfix + RD-A2 wire-up — REV po feedbacku

Akceptuję wszystkie 5 uwag. Aktualizacja oryginalnego planu poniżej, tylko zmiany.

### Zmiany vs poprzedni plan

**1. TL;DR diagnostyka (uwaga #1)**
W `useContactTldr.ts` dodaję pełen dump po invoke:
```ts
const { data, error } = await supabase.functions.invoke('sovra-contact-tldr', { body: { contact_id: contactId } });
console.log('[tldr]', { data, error, contact_id: contactId });
if (error) throw error;
```
Plus w `ContactHeaderTLDR.tsx` rozróżnienie 3 stanów:
- `data?.error === true` → "⚠️ TL;DR: błąd generowania (sprawdź logi funkcji)"
- `!data?.tldr || data.tldr === 'Brak podsumowania AI'` → "Brak podsumowania AI" + przycisk "Wygeneruj"
- inaczej → tekst.

**2. SectionMeetings — TODO comment (uwaga #2)**
Na górze pliku:
```ts
// TODO: rozszerzyć o gcal_events filtered po attendees jsonb (email kontaktu).
// Obecnie pokazuje tylko consultation_meetings via consultation_guests — niepełne źródło.
// Większość spotkań Remka leci przez Google Calendar.
```
Empty state copy zaktualizowany: „Brak konsultacji powiązanych z kontaktem (spotkania z kalendarza Google trafią tu w kolejnym sprincie)."

**3. SectionNotes — decyzja: tylko DELETE w tym sprincie, BEZ edit (uwaga #3)**
Świadome odłożenie. Przycisk „Edytuj" pomijam całkowicie (zero niedokończonego UI). W komentarzu pliku:
```ts
// TODO: edycja notatki — modal z formularzem (osobny sprint).
```
Tylko delete + AlertDialog jak w pierwotnym planie.

**4. Tab Spotkanie — wytnij cały kod (uwaga #4)**
W `ActivityComposer.tsx`:
- Usuwam `useState` dla meeting form fields (title, date, duration).
- Usuwam cały JSX `<TabsContent value="meeting">`.
- Zostaje tylko `<TabsTrigger value="meeting" disabled>` owinięty w Tooltip "Wkrótce — wymaga aktualizacji schematu".
- Defaultowy tab po usunięciu meeting form: nadal Notatka.

**5. SectionEmails — TODO comment (uwaga #5)**
Na górze pliku:
```ts
// TODO: trigram GIN index on gmail_messages(from, to) — performance dla większych tenantów.
// Obecnie ILIKE '%email%' = full scan, OK dla 1-2 tenantów.
```
Bez zmiany logiki query.

### Reszta planu bez zmian
- 8 nowych plików sekcji + SectionShell.
- 4 edycje (ContactDetailV2, ContactHeaderTLDR, SectionsAccordion, ActivityComposer).
- Bez zmian DB / edge functions / routingu.

### Pliki

**Nowe (8)**: `sections/SectionShell.tsx`, `sections/SectionCompany.tsx`, `sections/SectionInsurance.tsx`, `sections/SectionEmails.tsx`, `sections/SectionMeetings.tsx`, `sections/SectionNotes.tsx`, `sections/SectionAI.tsx`, `sections/SectionHistory.tsx`

**Edycje (5)**: `pages/ContactDetailV2.tsx`, `contact-v2/ContactHeaderTLDR.tsx`, `contact-v2/SectionsAccordion.tsx`, `contact-v2/ActivityComposer.tsx`, `hooks/useContactTldr.ts`

### Acceptance po implementacji
- Header: mailto / tel / linkedin (z guardami na null).
- 7 sekcji: realne dane lub jasny empty state. Zero „Sprint RD-A2".
- Tab Spotkanie: tylko `<TabsTrigger disabled>` + tooltip, zero martwego JSX/state.
- Konsola przy wejściu na kontakt: `[tldr] { data: {...}, error: ..., contact_id: ... }`.
- SectionAI: JSON pretty-print + Refresh button.
- SectionNotes: delete działa, edit pominięty świadomie.

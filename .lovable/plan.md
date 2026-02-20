
# Naprawa brakujacego powiazania kontaktu CRM z zadaniami w lejku

## Problem
Z 40 aktywnych zadan w lejku sprzedazy, **29 nie ma powiazania z kontaktem CRM** (brak rekordu w tabeli `task_contacts`). Dlatego w panelu szczegolów zadania (TaskDetailSheet) nie wyswietla sie wiersz "Kontakt".

## Przyczyna glowna
Sa **3 miejsca** w kodzie, ktore tworza zadania w kontekscie lejka BEZ tworzenia rekordu `task_contacts`:

### 1. `useCreateAssignment` (src/hooks/useDealsTeamAssignments.ts, linia 68-83)
Uzywany przez `ProspectingConvertDialog` przy konwersji prospekta do lejka. Tworzy zadanie z `deal_team_contact_id`, ale **nie tworzy rekordu `task_contacts`**. To jest glowne zrodlo problemu -- kazdy nowy kontakt w lejku dostaje zadanie bez powiazania CRM.

### 2. `NextActionDialog` (src/components/deals-team/NextActionDialog.tsx, linia 166-174)
Recykluje zadanie (UPDATE title, status, due_date), ale nie sprawdza czy `task_contacts` istnieje i nie tworzy go jesli brakuje. Jesli wejsciowe zadanie nie mialo kontaktu, recyklowane tez go nie bedzie miec.

### 3. `MeetingOutcomeDialog` (src/components/deals-team/MeetingOutcomeDialog.tsx, linia 94-102)
Tworzy NOWE zadanie przez `createTask.mutateAsync()` z `contactId` -- to jest OK, ale powoduje duplikaty zadan zamiast recyklowania (osobny problem, juz czesciowo rozwiazany).

## Plan naprawy

### Krok 1: Migracja SQL -- napraw istniejace dane
Dla wszystkich zadan w lejku (`deal_team_contact_id IS NOT NULL`) ktore nie maja rekordu `task_contacts`, utworzyc brakujace powiazania:

```sql
INSERT INTO task_contacts (task_id, contact_id, role)
SELECT t.id, dtc.contact_id, 'primary'
FROM tasks t
JOIN deal_team_contacts dtc ON dtc.id = t.deal_team_contact_id
WHERE t.deal_team_contact_id IS NOT NULL
  AND t.id NOT IN (SELECT task_id FROM task_contacts)
  AND dtc.contact_id IS NOT NULL;
```

### Krok 2: `src/hooks/useDealsTeamAssignments.ts` -- useCreateAssignment
Po pomyslnym INSERT zadania, dodac tworzenie `task_contacts`:

```typescript
// Po: const { data, error } = await supabase.from('tasks').insert({...})
// Dodac:
if (data) {
  // Pobierz contact_id z deal_team_contacts
  const { data: dtc } = await supabase
    .from('deal_team_contacts')
    .select('contact_id')
    .eq('id', params.teamContactId)
    .single();
  
  if (dtc?.contact_id) {
    await supabase.from('task_contacts').insert({
      task_id: data.id,
      contact_id: dtc.contact_id,
      role: 'primary',
    });
  }
}
```

### Krok 3: `src/components/deals-team/NextActionDialog.tsx` -- zabezpieczenie przy recyklowaniu
Po recyklowaniu zadania, sprawdzic czy `task_contacts` istnieje. Jesli nie -- utworzyc:

```typescript
// Po updateTask.mutateAsync (linia ~174):
// Ensure task_contacts exists
const { data: existingTc } = await supabase
  .from('task_contacts')
  .select('id')
  .eq('task_id', existingTaskId)
  .limit(1)
  .maybeSingle();

if (!existingTc && contactId) {
  await supabase.from('task_contacts').insert({
    task_id: existingTaskId,
    contact_id: contactId,
    role: 'primary',
  });
}
```

Wymaga dodania `contactId` do props `NextActionDialog` (aktualnie jest `contactName` ale nie ma `contactId` -- trzeba dodac i przekazac z `ContactTasksSheet`).

### Krok 4: `src/components/deals-team/ContactTasksSheet.tsx`
Przekazac `contactId={contact.contact_id}` do `NextActionDialog`.

## Pliki do zmiany (podsumowanie)
1. **Migracja SQL** -- naprawienie 29 istniejacych zadan bez `task_contacts`
2. **src/hooks/useDealsTeamAssignments.ts** -- `useCreateAssignment`: dodanie INSERT do `task_contacts`
3. **src/components/deals-team/NextActionDialog.tsx** -- dodanie prop `contactId`, zabezpieczenie `task_contacts` przy recyklowaniu
4. **src/components/deals-team/ContactTasksSheet.tsx** -- przekazanie `contactId` do `NextActionDialog`

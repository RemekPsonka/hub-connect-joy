
# Ulepszenie scalania duplikatow -- informacje o powiazaniach i pelne scalanie danych

## Problem
1. W modalu duplikatow nie widac, ktory kontakt ma przypisane zadania, jest w projektach, ma profil AI itp. -- ryzyko utraty danych
2. Scalanie nie przenosi wszystkich powiazanych rekordow (projekty, zadania, profil AI, deal teams)
3. Rozne numery telefonow nie sa zachowywane (phone + phone_business)
4. Rozne adresy email nie sa zachowywane (email + email_secondary)

## Rozwiazanie

### 1. Wyswietlanie informacji o powiazaniach przy kazdym kontakcie (FindDuplicatesModal.tsx)

W momencie ladowania duplikatow, pobrac dodatkowe dane dla kazdego kontaktu:
- Liczba zadan (`task_contacts` lub `tasks.assigned_to`)
- Liczba projektow (`project_contacts`)
- Czy jest w deal team (`deal_team_contacts`)
- Czy ma profil AI (`contact_agent_memory`)
- Czy ma `profile_summary`
- Liczba konsultacji (`consultations`)
- Liczba potrzeb/ofert (`needs`, `offers`)

Wyswietlic je jako male ikony/badge przy kazdym kontakcie w modalu, np.:
- Ikona Briefcase + "2 projekty"
- Ikona CheckSquare + "5 zadan"
- Ikona Brain + "Profil AI"
- Ikona Users + "Deal team"

### 2. Inteligentne scalanie telefonow i emaili (useDuplicateCheck.ts -- useMergeMultipleContacts)

Zmienic logike w `mutationFn`:

**Telefon**: Jesli primary ma `phone` a duplikat ma inny `phone`, a primary nie ma `phone_business` -- zapisac duplikatowy numer w `phone_business`. Analogicznie w drugq strone.

**Email**: Jesli primary ma `email` a duplikat ma inny `email`, a primary nie ma `email_secondary` -- zapisac w `email_secondary`.

**Adres**: Jesli primary ma `address` a duplikat ma inny `address`, a primary nie ma `address_secondary` -- zapisac w `address_secondary`.

### 3. Przenoszenie powiazanych rekordow (useDuplicateCheck.ts -- useMergeMultipleContacts)

Dodac przenoszenie tabel, ktore sa pomijane:
- `project_contacts` -- przenosic `contact_id` z duplikatu na primary
- `deal_team_contacts` -- przenosic `contact_id` (unikajac duplikatow kluczy)
- `contact_agent_memory` -- jesli primary nie ma, przenosic; jesli oba maja, zachowac lepszy (wiecej danych)
- `task_contacts` -- juz jest w bulk-merge, dodac tu tez
- `connections` -- przenosic oba kierunki (contact_a_id, contact_b_id)
- `consultation_guests`, `consultation_meetings`, `consultation_recommendations`, `consultation_thanks`
- `agent_conversations`

Zachowac lepszy `profile_summary` i `profile_embedding` (ten ktory nie jest pusty, preferujac dluzszy).

## Szczegoly techniczne

### Plik: `src/hooks/useDuplicateCheck.ts`

**useFindDuplicates** (queryFn, po pobraniu kontaktow):

Dodac zapytania o powiazania:
```typescript
// Pobierz powiazania dla wszystkich kontaktow
const contactIds = contacts.map(c => c.id);

const [taskContacts, projectContacts, dealTeamContacts, agentMemory, consultations, needs, offers] = await Promise.all([
  supabase.from('task_contacts').select('contact_id').in('contact_id', contactIds),
  supabase.from('project_contacts').select('contact_id').in('contact_id', contactIds),
  supabase.from('deal_team_contacts').select('contact_id').in('contact_id', contactIds),
  supabase.from('contact_agent_memory').select('contact_id').in('contact_id', contactIds),
  supabase.from('consultations').select('contact_id').in('contact_id', contactIds),
  supabase.from('needs').select('contact_id').in('contact_id', contactIds),
  supabase.from('offers').select('contact_id').in('contact_id', contactIds),
]);
```

Stworzyc mapy `contactId -> { tasks, projects, deals, hasAI, consultations, needs, offers }` i dodac te dane do kontaktow w grupach.

**useMergeMultipleContacts** (mutationFn):

Po sekcji "Merge data - fill empty fields from duplicates":

```typescript
// Smart phone merge
for (const dup of duplicates) {
  if (dup.phone && dup.phone !== primaryContact.phone) {
    if (!primaryContact.phone) {
      mergedData.phone = dup.phone;
    } else if (!(primaryContact.phone_business || mergedData.phone_business)) {
      mergedData.phone_business = dup.phone;
    }
  }
  if (dup.phone_business && !primaryContact.phone_business && !mergedData.phone_business) {
    mergedData.phone_business = dup.phone_business;
  }
}

// Smart email merge
// ... analogicznie dla email -> email_secondary

// Smart address merge
// ... analogicznie dla address -> address_secondary

// Keep best profile_summary
// Keep best profile_embedding
```

Po soft-delete duplikatow, dodac przenoszenie powiazanych rekordow:
```typescript
for (const dupId of duplicateIds) {
  // Transfer project_contacts
  await supabase.from('project_contacts').update({ contact_id: primaryContactId }).eq('contact_id', dupId);
  // Transfer deal_team_contacts
  await supabase.from('deal_team_contacts').update({ contact_id: primaryContactId }).eq('contact_id', dupId);
  // Transfer connections
  await supabase.from('connections').update({ contact_a_id: primaryContactId }).eq('contact_a_id', dupId);
  await supabase.from('connections').update({ contact_b_id: primaryContactId }).eq('contact_b_id', dupId);
  // Transfer consultations
  await supabase.from('consultations').update({ contact_id: primaryContactId }).eq('contact_id', dupId);
  // Transfer task_contacts
  await supabase.from('task_contacts').update({ contact_id: primaryContactId }).eq('contact_id', dupId);
  // Transfer agent_conversations
  await supabase.from('agent_conversations').update({ contact_id: primaryContactId }).eq('contact_id', dupId);
  // Transfer or keep best contact_agent_memory
  // ...
}
```

### Plik: `src/components/contacts/FindDuplicatesModal.tsx`

Rozszerzyc DuplicateGroup o dane powiazania i wyswietlic ikony:

```typescript
// Pod imieniem kontaktu, obok email/phone/company
{contact._relatedData?.tasks > 0 && (
  <Badge variant="outline" className="text-xs">
    <CheckSquare className="h-3 w-3 mr-1" /> {contact._relatedData.tasks} zadan
  </Badge>
)}
{contact._relatedData?.projects > 0 && (
  <Badge variant="outline" className="text-xs">
    <FolderOpen className="h-3 w-3 mr-1" /> {contact._relatedData.projects} projektow
  </Badge>
)}
{contact._relatedData?.hasAI && (
  <Badge variant="outline" className="text-xs text-purple-600">
    <Brain className="h-3 w-3 mr-1" /> Profil AI
  </Badge>
)}
```

### Plik: `src/hooks/useDuplicateCheck.ts` -- rozszerzenie typu

Dodac interfejs `ContactWithRelations` rozszerzajacy Contact o `_relatedData`:
```typescript
interface ContactRelatedData {
  tasks: number;
  projects: number;
  deals: number;
  hasAI: boolean;
  hasProfileSummary: boolean;
  consultations: number;
  needs: number;
  offers: number;
}
```

## Podsumowanie zmian

| Zmiana | Plik |
|--------|------|
| Pobieranie powiazanych danych kontaktow | useDuplicateCheck.ts (useFindDuplicates) |
| Ikony powiazanych danych w modalu | FindDuplicatesModal.tsx |
| Inteligentne scalanie phone/email/address | useDuplicateCheck.ts (useMergeMultipleContacts) |
| Przenoszenie powiazanych rekordow | useDuplicateCheck.ts (useMergeMultipleContacts) |
| Zachowywanie profilu AI i embedding | useDuplicateCheck.ts (useMergeMultipleContacts) |

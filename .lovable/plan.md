

# Naprawa badge'ow w imporcie PDF -- prawdziwe nazwy grup + "Dodaj do bazy"

## Problem

1. Badge'e po imporcie PDF sa generyczne ("Moj czlonek", "Czlonek CC") zamiast uzywac prawdziwych nazw grup z tabeli `contact_groups` (np. "CZLONEK REMEK CC", "CZLONEK CC Katowice").
2. Brak przycisku "Dodaj do bazy" -- dla uczestnikow nie-prospektow, ktorzy nie maja jeszcze `contactId`, powinno byc mozliwe utworzenie kontaktu w CRM z przypisana grupa.

## Rozwiazanie

### 1. `src/hooks/useMeetingParticipantImport.ts`

- Rozszerzyc interfejs `MatchedParticipant` o pole `groupName?: string | null`
- W `matchContactsFromParsed` zmienic SELECT na join z `contact_groups`:
  ```text
  .select('id, full_name, company, primary_group_id, director_id, contact_groups(name)')
  ```
- Przy dopasowaniu ustawiac `groupName` z `match.contact_groups?.name`

### 2. `src/components/meetings/ImportPDFMeetingDialog.tsx`

**Badge z prawdziwa nazwa grupy:**
- Zamiast statycznego `BADGE_CONFIG[p.matchType]` -- wyswietlac `p.groupName` jesli dostepne
- Dla prospektow -- badge "Prospect" (pomaranczowy) bez zmian
- Dla dopasowanych kontaktow -- badge z nazwa grupy (np. "CZLONEK REMEK CC")

**Dropdown badge -- lista grup z CRM:**
- Import `useContactGroups` do pobrania listy grup
- W Select zamiast 3 opcji (member/cc_member/prospect) -- wyswietlic liste wszystkich grup kontaktowych + opcje "Prospect"
- Zmiana grupy aktualizuje `primaryGroupId` i `groupName` na uczestniku
- Nowy typ matchType rozszerzony -- albo zamiast matchType uzywamy `groupId` do rozpoznania

**Przycisk "Dodaj do bazy":**
- Widoczny TYLKO dla uczestnikow ze statusem INNYM niz "prospect" i BEZ `contactId`
- Klikniecie tworzy kontakt w tabeli `contacts` z danymi z PDF:
  - `full_name`, `company`, `position` z parsowania
  - `primary_group_id` z wybranej grupy
  - `tenant_id`, `director_id` z kontekstu
  - `source: 'meeting_import'`
- Po utworzeniu -- aktualizuje `contactId` na uczestniku w liscie (bez odswiezania)

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/hooks/useMeetingParticipantImport.ts` | Dodanie `groupName` do interfejsu, join do `contact_groups` w SELECT |
| `src/components/meetings/ImportPDFMeetingDialog.tsx` | Badge z nazwa grupy, dropdown z lista grup z CRM, przycisk "Dodaj do bazy" |

## Szczegoly techniczne

### matchContactsFromParsed -- zmiana query i mapping

```text
const { data: contacts } = await supabase
  .from('contacts')
  .select('id, full_name, company, primary_group_id, director_id, contact_groups(name)')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .limit(1000);

// W match:
groupName: (match as any).contact_groups?.name || null,
```

### ImportPDFMeetingDialog -- badge z nazwa grupy

```text
// Logika wyswietlania badge:
const getBadgeInfo = (p: MatchedParticipant) => {
  if (p.matchType === 'prospect') {
    return { label: 'Prospect', className: 'bg-orange-500/10 text-orange-600 ...' };
  }
  return {
    label: p.groupName || 'Kontakt CH',
    className: p.matchType === 'member'
      ? 'bg-emerald-500/10 text-emerald-600 ...'
      : 'bg-indigo-500/10 text-indigo-600 ...',
  };
};
```

### Dropdown -- grupy z CRM + Prospect

```text
const { data: contactGroups = [] } = useContactGroups();

<Select
  value={p.matchType === 'prospect' ? 'prospect' : (p.primaryGroupId || p.matchType)}
  onValueChange={(v) => handleChangeBadge(i, v)}
>
  <SelectContent>
    {contactGroups.map(g => (
      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
    ))}
    <SelectItem value="prospect">Prospect</SelectItem>
  </SelectContent>
</Select>
```

Zmiana badge aktualizuje `primaryGroupId`, `groupName` i `matchType` na uczestniku.

### Przycisk "Dodaj do bazy"

```text
{p.matchType !== 'prospect' && !p.contactId && (
  <Button size="sm" variant="outline" onClick={() => handleAddToDatabase(i)}>
    <UserPlus className="h-3 w-3 mr-1" /> Dodaj do bazy
  </Button>
)}
```

Funkcja `handleAddToDatabase`:

```text
const handleAddToDatabase = async (index: number) => {
  const p = participants[index];
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      director_id: directorId,
      full_name: p.parsed.full_name,
      company: p.parsed.company || null,
      position: p.parsed.position || null,
      primary_group_id: p.primaryGroupId || null,
      source: 'meeting_import',
    })
    .select('id')
    .single();

  if (error) { toast.error('Blad dodawania'); return; }

  // Aktualizuj uczestnika w liscie
  setParticipants(prev => prev.map((pp, i) =>
    i === index ? { ...pp, contactId: data.id } : pp
  ));
  toast.success('Kontakt dodany do bazy');
};
```


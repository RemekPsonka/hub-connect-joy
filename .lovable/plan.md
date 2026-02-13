
# Naprawa spojnosci danych kontaktow i firm

## Zidentyfikowane problemy

### Problem 1: Brak nazwy firmy na kartach Kanban (1193 kontaktow)
Hook `useTeamContacts` pobiera `contacts.company` (tekst), ktory jest `null` dla 1193 kontaktow. Te kontakty maja `company_id` wskazujacy na tabele `companies`, ale nazwa firmy nie jest z niej pobierana.

### Problem 2: Konwersja prospektow nie linkuje do tabeli `companies`
`ProspectingConvertDialog` tworzy nowy kontakt z `company: prospect.company` (tekst), ale NIE ustawia `company_id`. Nowy kontakt nie jest powiazany z rekordem firmy, nawet jesli firma juz istnieje w tabeli `companies`.

### Problem 3: Tabela `meeting_prospects` przechowuje firme jako tekst
Tabela `meeting_prospects` ma kolumne `company` (tekst) bez powiazania z tabela `companies`. Po konwersji na kontakt, ta tekstowa nazwa jest kopiowana do `contacts.company`, ale `company_id` nie jest uzupelniane.

### Problem 4: 34 kontakty maja `company` (tekst) ale brak `company_id`
Czesc z nich ma odpowiedniki w tabeli `companies` (np. "verocargo" = "Verocargo", "Ferox Energy Systems"), ale nie sa polaczone z powodu roznic w wielkosci liter lub braku automatycznego linkowania.

## Plan naprawy

### 1. `src/hooks/useDealsTeamContacts.ts` - rozwiazanie nazwy firmy z `companies`
W hookach `useTeamContacts` i `useTeamContact`, po pobraniu kontaktow CRM, dodatkowe zapytanie do tabeli `companies` dla kontaktow z `company_id` ale bez `company`. Uzupelnienie pola `company` nazwa z tabeli `companies`.

```typescript
// Po pobraniu contacts (linia 56-58):
// Dla kontaktow bez company ale z company_id - pobierz nazwy z companies
const needCompanyResolve = contacts?.filter(c => !c.company && c.company_id) || [];
if (needCompanyResolve.length > 0) {
  const companyIds = [...new Set(needCompanyResolve.map(c => c.company_id))];
  const { data: companies } = await supabase
    .from('companies').select('id, name').in('id', companyIds);
  const companyMap = new Map(companies?.map(co => [co.id, co.name]));
  for (const c of contacts) {
    if (!c.company && c.company_id) c.company = companyMap.get(c.company_id) || null;
  }
}
```

Analogiczna zmiana w `useTeamContact` (single contact).

### 2. `src/components/deals-team/ProspectingConvertDialog.tsx` - linkowanie firmy przy konwersji
Przy tworzeniu nowego kontaktu z prospektu, wyszukanie firmy w tabeli `companies` po nazwie (case-insensitive). Jesli istnieje - ustawienie `company_id`. Jesli nie - utworzenie nowego rekordu firmy ze statusem `pending` (co uruchomi automatyczne wzbogacanie AI).

```typescript
// Przed INSERT do contacts (linia 214):
let companyId: string | null = null;
if (prospect.company) {
  // Szukaj istniejącej firmy
  const { data: existingCompany } = await supabase
    .from('companies').select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', prospect.company.trim())
    .limit(1).maybeSingle();
  
  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    // Utworz nowa firme
    const { data: newCompany } = await supabase
      .from('companies')
      .insert({ name: prospect.company.trim(), tenant_id: tenantId, status: 'pending' })
      .select('id').single();
    companyId = newCompany?.id || null;
  }
}

// W INSERT do contacts dodaj: company_id: companyId
```

### 3. Migracja SQL - uzupelnienie brakujacych `company_id` dla istniejacych danych
Jednorazowe zapytanie UPDATE, ktore dla 34 kontaktow z `company` (tekst) ale bez `company_id` sprobuje dopasowac firme po nazwie (case-insensitive).

```sql
UPDATE contacts c
SET company_id = co.id
FROM companies co
WHERE c.company_id IS NULL
  AND c.company IS NOT NULL
  AND LOWER(TRIM(c.company)) = LOWER(TRIM(co.name))
  AND c.tenant_id = co.tenant_id;
```

### 4. Migracja SQL - uzupelnienie `company` (tekst) z `companies` dla 1193 kontaktow
Uzupelnienie brakujacego tekstu firmy na kontaktach, ktore maja `company_id`.

```sql
UPDATE contacts c
SET company = co.name
FROM companies co
WHERE c.company_id = co.id
  AND c.company IS NULL
  AND co.name IS NOT NULL;
```

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/useDealsTeamContacts.ts` | Resolve company name z tabeli `companies` gdy brakuje tekstu |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Linkowanie/tworzenie firmy przy konwersji prospekta |
| Migracja SQL | Uzupelnienie `company_id` (34 kontakty) i `company` tekst (1193 kontakty) |

## Efekt
- Karty na Kanbanie pokaza nazwy firm
- Nowe kontakty z prospektingu beda automatycznie linkowane do tabeli `companies`
- Istniejace dane zostana naprawione jednorazowa migracja
- Kazdy kontakt bedzie mial zarowno `company` (tekst do wyswietlania) jak i `company_id` (powiazanie z rekordem firmy)

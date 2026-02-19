
# Poprawka sugestii AI — tylko dokladne dopasowania

## Problem
Hook `useWantedAISuggestions` wyszukuje kontakty po fragmencie branzy/firmy (`company.ilike.%budowlana%`), co zwraca losowe kontakty z calej branzy budowlanej. Uzytkownik chce widziec TYLKO kontakty z dokladnie tej samej firmy lub o tym samym nazwisku.

## Rozwiazanie

### 1. Zmiana w `WantedContactCard.tsx`
Przekazac do `WantedAISuggestions` zarowno `company_name` jak i `person_name` (zamiast samej branzy):

```
<WantedAISuggestions
  companyName={item.company_name}
  personName={item.person_name}
  wantedId={item.id}
/>
```

### 2. Zmiana w `WantedAISuggestions.tsx`
Zaktualizowac props na `companyName` i `personName`, uzyc nowego hooka.

### 3. Zmiana w `useWantedContacts.ts` — hook `useWantedAISuggestions`
Zamiast szukac po branzy, szukac po:
- dokladnej nazwie firmy (`company.ilike.${companyName}`) — case-insensitive ale pelna nazwa
- LUB dokladnym nazwisku (`full_name.ilike.%${personName}%`) — jesli person_name jest podane

Nowa sygnatura:
```
useWantedAISuggestions(companyName: string | null, personName: string | null)
```

Nowe zapytanie:
```typescript
// Budujemy filtr OR: ta sama firma LUB to samo nazwisko
const filters = [];
if (companyName) filters.push(`company.ilike.${companyName}`);
if (personName) filters.push(`full_name.ilike.%${personName}%`);

const { data } = await supabase
  .from('contacts')
  .select('id, full_name, company, position')
  .or(filters.join(','))
  .limit(5);
```

Dzieki temu dla "Eurovia Polska" pokaze TYLKO kontakty z firmy "Eurovia Polska", a nie z Rex-Bud Budownictwo czy Kdbudownictwo.

### Pliki do zmiany:
1. `src/hooks/useWantedContacts.ts` — zmiana hooka `useWantedAISuggestions`
2. `src/components/wanted/WantedAISuggestions.tsx` — nowe props
3. `src/components/wanted/WantedContactCard.tsx` — przekazanie `company_name` i `person_name`

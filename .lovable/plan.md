
# Grupowanie poszukiwanych -- "Szukaja takze: X, Y, Z"

## Cel
Gdy kilka osob szuka tego samego kontaktu/firmy, na kafelku wyswietlic informacje kto jeszcze szuka (np. "Szukaja takze: Anna Kowalska, Jan Nowak").

## Logika dopasowania
Dwa wpisy `wanted_contacts` sa "tym samym poszukiwanym" jesli maja identyczne (case-insensitive):
- `person_name` (jesli oba nie-null) ORAZ `company_name` (jesli oba nie-null)
- LUB jesli jeden szuka tylko firmy -- dopasowanie po `company_name`
- LUB jesli jeden szuka tylko osoby -- dopasowanie po `person_name`

## Zmiany

### 1. Strona `WantedContacts.tsx` -- obliczenie grupy szukajacych
- Po pobraniu listy `items`, zbudowac mape: klucz = `(person_name?.toLowerCase() || '') + '|' + (company_name?.toLowerCase() || '')` -> tablica requesters (imiona osob szukajacych + ich ID kontaktu)
- Przekazac do `WantedContactCard` nowy prop `otherRequesters` -- lista pozostalych osob szukajacych tego samego (bez aktualnego requestera)

### 2. Komponent `WantedContactCard.tsx` -- wyswietlenie
- Nowy prop: `otherRequesters?: Array<{ contactId: string; name: string }>`
- Pomiedzy sekcja "Szuka:" a akcjami, dodac sekcje:
  ```
  Szukaja takze: Anna Kowalska, Jan Nowak (+2 wiecej)
  ```
- Kazde imie jako link do `/contacts/:id`
- Pokazac max 3 imiona, reszta jako "+N wiecej"
- Ikona `Users` z lucide-react obok tekstu
- Styl: maly tekst, kolor `text-amber-600` zeby sie wyroznialo

### 3. Komponent `ContactWantedTab.tsx` -- analogiczne grupowanie
- Ten sam mechanizm co na stronie glownej, ale w kontekscie zakladki kontaktu

## Szczegoly techniczne

Nowa funkcja pomocnicza (w `WantedContactCard.tsx` lub osobny util):
```typescript
function buildRequesterGroups(items: WantedContact[]): Map<string, Array<{ contactId: string; name: string }>> {
  const groups = new Map<string, Array<{...}>>();
  for (const item of items) {
    const key = `${(item.person_name || '').toLowerCase().trim()}|${(item.company_name || '').toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      contactId: item.requested_by_contact_id,
      name: item.requested_by_contact?.full_name || 'Nieznany',
      wantedId: item.id,
    });
  }
  return groups;
}
```

W `WantedContacts.tsx`:
```typescript
const requesterGroups = useMemo(() => buildRequesterGroups(items || []), [items]);

// Dla kazdego item:
const key = `${(item.person_name || '').toLowerCase().trim()}|${(item.company_name || '').toLowerCase().trim()}`;
const allRequesters = requesterGroups.get(key) || [];
const otherRequesters = allRequesters.filter(r => r.wantedId !== item.id);
```

W `WantedContactCard.tsx` -- nowa sekcja renderingu:
```tsx
{otherRequesters && otherRequesters.length > 0 && (
  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
    <Users className="h-3.5 w-3.5 shrink-0" />
    <span>
      Szukają także:{' '}
      {otherRequesters.slice(0, 3).map((r, i) => (
        <Fragment key={r.contactId}>
          {i > 0 && ', '}
          <Link to={`/contacts/${r.contactId}`} className="font-medium hover:underline">{r.name}</Link>
        </Fragment>
      ))}
      {otherRequesters.length > 3 && ` (+${otherRequesters.length - 3} więcej)`}
    </span>
  </div>
)}
```

## Pliki do zmiany
1. `src/pages/WantedContacts.tsx` -- budowanie grup, przekazanie prop
2. `src/components/wanted/WantedContactCard.tsx` -- nowy prop + renderowanie sekcji
3. `src/components/contacts/ContactWantedTab.tsx` -- analogiczne grupowanie

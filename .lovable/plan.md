

# Naprawa wyswietlania kontaktow (lista Osoby i Firmy)

## Problem

Obie tabele -- **ContactsTable** (lista osob) i **CompaniesTable** (lista firm) -- maja bledy layoutu spowodowane virtualizacja:

1. **Podwojny scroll**: Naglowek i cialo tabeli sa w osobnych kontenerach scroll, przez co kolumny sie rozjezdzaja
2. **Konflikt elementow** (CompaniesTable): Uzycie `display: flex` na elementach `<tr>` lamie natywne zachowanie tabeli
3. **Rozne szerokosci**: Naglowek rozciaga sie na cala szerokosc, ale cialo ma stale piksele -- na szerszych ekranach kolumny sie nie pokrywaja

## Rozwiazanie

Zamiana obu tabel na **layout oparty na divach** z jednym kontenerem scroll dla naglowka i ciala. Virtualizacja zostaje bez zmian.

### Struktura docelowa

```text
<div className="border rounded-lg overflow-hidden">
  <div className="overflow-x-auto">
    <div style={{ minWidth: calkowitaSzerokoscKolumn }}>

      <!-- Naglowek: div + flex -->
      <div className="flex bg-muted/50 border-b">
        <div className="w-[200px] flex-shrink-0">Kolumna 1</div>
        <div className="w-[120px] flex-shrink-0">Kolumna 2</div>
        ...
      </div>

      <!-- Cialo: virtualizowane divy -->
      <div ref={parentRef} style={{ maxHeight: 'calc(100vh - 350px)' }}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(item => (
            <div className="flex absolute w-full" style={{ transform, height }}>
              <div className="w-[200px] flex-shrink-0">Dane 1</div>
              ...
            </div>
          ))}
        </div>
      </div>

    </div>
  </div>
</div>
```

## Pliki do modyfikacji

### 1. `src/components/contacts/ContactsTable.tsx`

**Szerokosci kolumn** (suma = 1190px):
- Checkbox: 50px
- Imie i nazwisko: 220px
- Firma: 180px
- Stanowisko: 140px
- Telefon: 150px
- Email: 180px
- Grupa: 100px
- Profil AI: 140px
- Sila relacji: 130px

**Zmiany**:
- Usuniecie surowych elementow `<table>`, `<thead>`, `<th>`, `<tbody>`, `<tr>`, `<td>`
- Zastapienie elementami `<div>` z layoutem flex
- Jeden wrapper `overflow-x-auto` dla naglowka i ciala
- `minWidth` na wewnetrznym kontenerze rowny sumie kolumn
- Naglowek uzywa tych samych stalych szerokosci co cialo
- Zachowana cala funkcjonalnosc: checkbox, sortowanie, bulk actions, paginacja, generowanie AI

### 2. `src/components/contacts/CompaniesTable.tsx`

**Szerokosci kolumn** (suma = 900px):
- Nazwa firmy: 220px
- Miasto: 120px
- NIP: 140px
- Osoba kluczowa: 200px
- Telefon: 140px
- Profil AI: 140px

**Zmiany**:
- Usuniecie komponentow `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableHead>`, `<TableBody>`, `<TableCell>`
- Zastapienie elementami `<div>` z layoutem flex
- Ten sam wzorzec jednego kontenera scroll
- Naprawienie problemu `<tr display:flex>`
- Zachowana cala funkcjonalnosc: sortowanie, paginacja, generowanie AI, nawigacja

## Co sie NIE zmienia

- `ContactsHeader.tsx` -- bez zmian
- `Contacts.tsx` (strona) -- bez zmian
- Wszystkie hooki (`useContacts`, `useCompanies` itd.) -- bez zmian
- Logika paginacji -- identyczna
- Pasek akcji zbiorczych -- identyczny
- Virtualizacja `@tanstack/react-virtual` -- zachowana
- Sortowanie, filtry, rozmiar strony -- wszystko zachowane

## Sekcja techniczna

### ContactsTable -- kluczowe fragmenty

Naglowek (divy zamiast table):
```typescript
const CONTACTS_MIN_WIDTH = 1190;

<div className="border rounded-lg overflow-hidden">
  <div className="overflow-x-auto">
    <div style={{ minWidth: CONTACTS_MIN_WIDTH }}>
      {/* Naglowek */}
      <div className="flex items-center border-b bg-muted/50 h-12 text-sm font-medium text-muted-foreground">
        <div className="px-4 w-[50px] flex-shrink-0">
          <Checkbox ... />
        </div>
        <div className="px-4 w-[220px] flex-shrink-0">
          <Button variant="ghost" onClick={() => handleSort('full_name')}>
            Imie i nazwisko <ArrowUpDown />
          </Button>
        </div>
        ...
      </div>

      {/* Cialo virtualizowane */}
      <div ref={parentRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualItem => {
            const contact = contacts[virtualItem.index];
            return (
              <div
                key={contact.id}
                className="flex items-center border-b cursor-pointer hover:bg-muted/50 absolute w-full transition-colors"
                style={{ height: ROW_HEIGHT, transform: `translateY(${virtualItem.start}px)` }}
                onClick={() => navigate(`/contacts/${contact.id}`)}
              >
                <div className="px-4 w-[50px] flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <Checkbox ... />
                </div>
                <div className="px-4 w-[220px] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar>...</Avatar>
                    <span className="font-medium truncate">{contact.full_name}</span>
                  </div>
                </div>
                ...
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
</div>
```

### CompaniesTable -- analogicznie

```typescript
const COMPANIES_MIN_WIDTH = 960;

// Ta sama struktura: div wrapper -> div header -> div virtualized body
// Bez importow Table/TableRow/TableCell z shadcn
```



# Modul "Zasoby" -- mapa instytucjonalnych polaczen

## Koncept

Modul "Zasoby" sluzy do mapowania dostepu do waznych instytucji (banki, ubezpieczyciele, firmy leasingowe, kancelarie itp.) przez Twoje kontakty z CRM. Kluczowa roznica wobec CRM: nie przechowujesz tu danych osob z tych instytucji, ale rejestrujesz **kto z Twoich kontaktow ma tam dojscie** i do kogo.

```text
Instytucja (np. PKO BP)
  └── Zasob: "Zarzad - dyrektor kredytow"
        └── Connector: Kontakt z CRM (Jan Kowalski) -- "zna dyrektora od 5 lat"
        └── Connector: Kontakt z CRM (Anna Nowak) -- "kolega ze studiow"
```

## Baza danych -- 3 nowe tabele

### 1. `resource_institutions` -- instytucje
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | izolacja danych |
| name | text NOT NULL | np. "PKO BP", "PZU SA" |
| category | text | bank / ubezpieczyciel / leasing / kancelaria / fundusz / inne |
| description | text | dodatkowy opis |
| logo_url | text | opcjonalnie |
| created_by | uuid FK directors | kto dodal |
| created_at / updated_at | timestamptz | |

### 2. `resource_entries` -- konkretne zasoby/pozycje w instytucji
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| institution_id | uuid FK resource_institutions | |
| title | text NOT NULL | np. "Zarzad", "Dział Kredytów Korporacyjnych" |
| person_name | text | imie i nazwisko osoby w instytucji (opcjonalne) |
| person_position | text | stanowisko (opcjonalne) |
| notes | text | dodatkowe info |
| importance | text | low / medium / high / critical |
| created_by | uuid FK directors | |
| created_at / updated_at | timestamptz | |

### 3. `resource_connectors` -- kto z CRM ma tam dojscie
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| resource_entry_id | uuid FK resource_entries | |
| contact_id | uuid FK contacts | kontakt z CRM |
| relationship_description | text | "zna od 10 lat", "kolega ze studiow" |
| strength | text | weak / moderate / strong / direct |
| verified | boolean DEFAULT false | czy zweryfikowano |
| last_verified_at | timestamptz | |
| created_by | uuid FK directors | |
| created_at | timestamptz | |

### RLS
Wszystkie 3 tabele: `tenant_id = get_current_tenant_id()`. Polityki SELECT, INSERT, UPDATE, DELETE na podstawie tenant_id.

## Frontend

### 1. Strona `/resources` -- `src/pages/Resources.tsx`
- Naglowek z ikona `Landmark` i tytulem "Zasoby"
- Widok glowny: lista instytucji pogrupowana po kategorii (accordion lub karty)
- Kazda instytucja rozwijana -- pokazuje zasoby (entries) i kto ma dojscie (connectors)
- Filtry: kategoria, wyszukiwanie po nazwie
- Przycisk "Dodaj instytucje"

### 2. Komponenty -- `src/components/resources/`
- `InstitutionCard.tsx` -- karta instytucji z lista zasobow
- `ResourceEntryRow.tsx` -- wiersz zasobu z lista connectorow
- `ConnectorBadge.tsx` -- badge z nazwa kontaktu CRM i sila polaczenia
- `AddInstitutionDialog.tsx` -- dialog dodawania instytucji (nazwa, kategoria)
- `AddResourceEntryDialog.tsx` -- dialog dodawania zasobu do instytucji
- `AddConnectorDialog.tsx` -- dialog linkowania kontaktu CRM z zasobem (wyszukiwanie kontaktow)

### 3. Hook -- `src/hooks/useResources.ts`
- `useInstitutions()` -- lista instytucji z zagniezdzonymi entries i connectors
- `useCreateInstitution()`, `useUpdateInstitution()`, `useDeleteInstitution()`
- `useCreateResourceEntry()`, `useDeleteResourceEntry()`
- `useCreateConnector()`, `useDeleteConnector()`

### 4. Nawigacja
- Dodanie do sidebara w sekcji CRM: `{ title: 'Zasoby', url: '/resources', icon: Landmark }`
- Route w `App.tsx`: `<Route path="/resources" element={<DirectorGuard><Resources /></DirectorGuard>} />`

## Przeplyw uzytkownika

1. Wchodzi w "Zasoby" z sidebara
2. Klika "Dodaj instytucje" -- wpisuje "PKO BP", kategoria "Bank"
3. W karcie PKO BP klika "Dodaj zasob" -- wpisuje "Zarzad - Dyrektor Kredytow Korporacyjnych"
4. W zasobie klika "Dodaj polaczenie" -- wyszukuje kontakt z CRM (np. "Jan Kowalski"), opisuje relacje ("znajomy ze studiow, silne polaczenie")
5. Teraz widzi: PKO BP > Zarzad > Jan Kowalski (silne) -- wie przez kogo ma dojscie

## Podsumowanie plikow

| Plik | Akcja |
|------|-------|
| Migracja SQL | 3 tabele + RLS |
| `src/pages/Resources.tsx` | Nowa strona |
| `src/hooks/useResources.ts` | CRUD hooki |
| `src/components/resources/*.tsx` | 6 komponentow |
| `src/App.tsx` | Nowy route |
| `src/components/layout/AppSidebar.tsx` | Nowy wpis w CRM |

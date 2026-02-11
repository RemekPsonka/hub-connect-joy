

# Dodanie kategorii "Cold Lead" do Kanban

## Zakres zmian

Nowa kategoria `cold` zostanie dodana jako najnizszy etap w lejku sprzedazowym, ponizej LEAD. Cold Lead to kontakt "zimny" -- wczesny etap, jeszcze bez kwalifikacji.

## Brak zmian w bazie danych

Kolumna `category` w tabeli `deal_team_contacts` jest typu `text` bez ograniczen CHECK -- nie potrzeba migracji SQL.

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/types/dealTeam.ts` | Dodanie `'cold'` do typu `DealCategory` |
| `src/components/deals-team/KanbanBoard.tsx` | Nowa kolumna COLD LEAD z filtrem + nowy komponent `ColdLeadCard` (lub reuse `LeadCard`) |
| `src/components/deals-team/ColdLeadCard.tsx` | **Nowy plik** -- karta cold leada z przyciskiem "do LEAD" |
| `src/components/deals-team/TeamStats.tsx` | Nowa karta statystyk dla COLD (grid 5 kolumn) |
| `src/components/deals-team/TableView.tsx` | Dodanie `cold` do `categoryConfig` i `categoryOrder` |
| `src/components/deals-team/AddContactDialog.tsx` | Dodanie opcji `cold` w Select kategorii |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Dodanie `cold` do `categoryConfig` |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Dodanie `cold` do listy kategorii przy konwersji |
| `src/hooks/useDealsTeamContacts.ts` | Dodanie `cold_count` do statystyk |

## Szczegoly techniczne

### 1. Typ `DealCategory` (dealTeam.ts)

```text
// Przed:
export type DealCategory = 'hot' | 'top' | 'lead';

// Po:
export type DealCategory = 'hot' | 'top' | 'lead' | 'cold';
```

### 2. `DealTeamContactStats` -- dodanie `cold_count`

### 3. KanbanBoard -- nowa kolumna COLD LEAD

- Ikona: `❄️` lub `🧊`
- Kolor: `slate` / `gray`
- Kolejnosc: HOT > TOP > LEAD > COLD > POSZUKIWANI
- Grid zmieni sie na `lg:grid-cols-5`

### 4. ColdLeadCard

- Podobny do LeadCard ale z przyciskiem "do LEAD" (awans w gore)
- Kolor border: `border-l-slate-400`

### 5. TableView -- categoryOrder

```text
const categoryOrder = { hot: 4, top: 3, lead: 2, cold: 1 };
```

### 6. ProspectingConvertDialog -- domyslna kategoria `cold`

Przy konwersji prospekta domyslna kategoria zmieni sie z `lead` na `cold` (zimny kontakt dopiero wchodzi do lejka).


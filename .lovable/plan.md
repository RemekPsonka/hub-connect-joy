
# Refaktoryzacja DealDetail - struktura zakładkowa

## Cel
Przekształcenie strony szczegółów deal z obecnego widoku kolumnowego na interfejs z zakładkami (Tabs), zgodnie z pokazanym wzorcem.

## Analiza obecnego stanu

### Obecna struktura `src/pages/DealDetail.tsx`:
- Header z przyciskami akcji (Wygrany/Przegrany/Usuń)
- 3 karty KPI (Wartość, Prawdopodobieństwo, Oczekiwany przychód)
- Grid 2-kolumnowy: Karta "Szczegóły" + Timeline aktywności
- Sekcja produktów na dole

### Docelowa struktura (zgodnie z snippetem):
- Header z przyciskami (Edit, Trash, Win, Lost)
- Badge statusu dla zamkniętych deals
- Tabs: **Przegląd** | **Produkty (X)** | **Historia**

## Nowe komponenty do utworzenia

### 1. `src/components/deals/DealOverview.tsx`
Zakładka "Przegląd" - połączenie obecnych KPI + szczegółów:

```text
┌─────────────────────────────────────────────────────┐
│  KPI Cards (3 kolumny)                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Wartość     │ │ Prawdop.    │ │ Oczek.przych│   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                     │
│  Karta Szczegóły (kontakt, firma, data, źródło...) │
└─────────────────────────────────────────────────────┘
```

Props:
- `deal: Deal` - obiekt deala
- `teamDetails?: DealTeam` - szczegóły zespołu

### 2. `src/components/deals/DealProducts.tsx`
Zakładka "Produkty" - wrapper dla istniejącego `DealProductsCard`:

Props:
- `dealId: string`
- `currency: string`
- `onValueChange?: (total: number) => void`

### 3. `src/components/deals/DealTimeline.tsx`
Zakładka "Historia" - wrapper dla istniejącego `DealActivitiesTimeline`:

Props:
- `activities: DealActivity[]`
- `isLoading: boolean`
- `currency?: string`

## Modyfikacja strony

### `src/pages/DealDetail.tsx`

Nowa struktura:

```text
┌─────────────────────────────────────────────────────┐
│  Header                                             │
│  ← Powrót    [Tytuł] [Status Badge]                │
│              [Stage Badge]                          │
│                              [Win] [Lost] [🗑️]     │
├─────────────────────────────────────────────────────┤
│  [Przegląd] [Produkty (3)] [Historia]              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <Zawartość aktywnej zakładki>                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Szczegóły techniczne

### Importy do dodania w DealDetail:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealOverview } from '@/components/deals/DealOverview';
import { DealProducts } from '@/components/deals/DealProducts';
import { DealTimeline } from '@/components/deals/DealTimeline';
```

### Zmiana układu:
- Usunięcie bezpośrednich kart KPI i szczegółów z głównego pliku
- Zastąpienie ich komponentem `Tabs` z trzema zakładkami
- Przeniesienie logiki renderowania do odpowiednich sub-komponentów

### Zachowanie funkcjonalności:
- Akcje `handleMarkAsWon`, `handleMarkAsLost`, `handleDelete` pozostają w głównym pliku
- `onValueChange` dla produktów przekazywany do `DealProducts`
- Loading i error states bez zmian

## Pliki do utworzenia/modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| `src/components/deals/DealOverview.tsx` | Nowy | KPI + szczegóły deala |
| `src/components/deals/DealProducts.tsx` | Nowy | Wrapper dla produktów |
| `src/components/deals/DealTimeline.tsx` | Nowy | Wrapper dla historii |
| `src/pages/DealDetail.tsx` | Modyfikacja | Struktura z Tabs |
| `src/components/deals/index.ts` | Aktualizacja | Eksport nowych komponentów |

## Efekt końcowy

Strona szczegółów deal będzie:
1. Bardziej uporządkowana dzięki zakładkom
2. Szybsza w nawigacji (produkty i historia ładowane na żądanie)
3. Pokazywać liczbę produktów w nazwie zakładki
4. Zachowywać pełną dotychczasową funkcjonalność

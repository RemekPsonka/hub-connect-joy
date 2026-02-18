
# Widok "Szybka lista" na stronie Poszukiwani

## Cel
Dodac przelacznik widoku (karty / lista) na stronie Poszukiwani. Widok "szybka lista" pokazuje kompaktowe wiersze: logo firmy, nazwa firmy, nazwisko osoby (lub "brak") -- bez dodatkowych informacji jak "kto szuka", daty, pilnosc itd.

## Zmiany

### 1. `src/pages/WantedContacts.tsx`
- Dodac stan `viewMode: 'cards' | 'list'` (domyslnie `'cards'`)
- Dodac przelacznik (dwa przyciski z ikonami `LayoutGrid` / `List`) obok filtrow lub w headerze
- Gdy `viewMode === 'list'` -- zamiast siatki kart renderowac kompaktowa tabele/liste
- Widok listy: prosta lista wierszy z `CompanyLogo`, `company_name`, `person_name || '—'`, plus maly badge statusu

### 2. Nowy komponent `src/components/wanted/WantedQuickList.tsx`
- Przyjmuje `items: WantedContact[]`
- Renderuje `Card` z wierszami w formacie:
  ```
  [Logo] Firma                  Nazwisko        [badge status]
  ```
- Kazdy wiersz klikalny -- otwiera akcje lub szczegoly
- Uzywa `CompanyLogo` (juz istniejacy komponent) do wyswietlenia logo firmy
- Jesli brak `person_name` -- wyswietla "—" w kolorze muted
- Kompaktowy: `py-1.5`, maly tekst, bez dodatkowych danych

### Szczegoly techniczne

**Przelacznik widoku w headerze (WantedContacts.tsx):**
```tsx
import { LayoutGrid, List } from 'lucide-react';

const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

// W sekcji filtrow:
<div className="flex gap-1">
  <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="icon" className="h-8 w-8"
    onClick={() => setViewMode('cards')}><LayoutGrid className="h-4 w-4" /></Button>
  <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8"
    onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
</div>
```

**Komponent WantedQuickList:**
```tsx
<Card>
  <CardContent className="p-0 divide-y">
    {items.map(item => (
      <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50">
        <CompanyLogo companyName={item.company_name} size="sm" />
        <span className="font-medium text-sm truncate flex-1">
          {item.company_name || '—'}
        </span>
        <span className="text-sm text-muted-foreground truncate w-[180px]">
          {item.person_name || '—'}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {statusLabels[item.status]}
        </Badge>
      </div>
    ))}
  </CardContent>
</Card>
```

### Pliki do zmiany/utworzenia:
1. **Nowy**: `src/components/wanted/WantedQuickList.tsx` -- kompaktowy widok listy
2. **Edycja**: `src/pages/WantedContacts.tsx` -- przelacznik widoku + renderowanie warunkowe

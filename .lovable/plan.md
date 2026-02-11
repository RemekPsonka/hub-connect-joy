

# Edycja grup produktow (Product Categories)

## Cel

Dodanie mozliwosci edycji istniejacych grup produktow w `ProductCategoryManager` -- zmiana nazwy, koloru i prowizji. Obecnie kategorie sa wyswietlane jako read-only.

## Zakres zmian

### Plik: `src/components/deals-team/ProductCategoryManager.tsx`

Dodanie trybu edycji inline dla kazdej kategorii (wzorzec analogiczny do `DefaultPositionsManager`):

**Stan edycji:**
- `editingId` -- ID aktualnie edytowanej kategorii (lub null)
- `editName`, `editColor`, `editCommission` -- wartosci formularza edycji

**Dla kazdej kategorii w liscie:**
- Gdy NIE edytowana: wyswietlenie jak dotychczas + przycisk edycji (ikona `Pencil`) i usuwania (ikona `X`)
- Gdy edytowana: zamiana na formularz inline z:
  - Input nazwy
  - Paleta kolorow (te same `colorOptions`)
  - Input prowizji %
  - Przycisk zapisu (ikona `Check`) i anulowania (ikona `X`)

**Logika:**
- Klikniecie `Pencil` ustawia `editingId` i wypelnia pola danymi kategorii
- Klikniecie `Check` lub Enter wywoluje `updateCategory.mutateAsync`
- Klikniecie `X` (przy edycji) lub Escape anuluje edycje
- Usuwanie kategorii uzywa `updateCategory` z `isActive: false` (soft delete)

### Plik: `src/hooks/useProductCategories.ts`

Bez zmian -- hook `useUpdateProductCategory` juz obsluguje aktualizacje nazwy, koloru, prowizji i `isActive`.

## Szczegoly techniczne

### Widok kategorii -- tryb normalny

```text
<div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
  <span className="text-sm font-medium flex-1">{cat.name}</span>
  {cat.default_commission_percent > 0 && (
    <Badge>{cat.default_commission_percent}% prowizji</Badge>
  )}
  <Button variant="ghost" size="sm" onClick={() => startEditing(cat)}>
    <Pencil className="h-3.5 w-3.5" />
  </Button>
  <Button variant="ghost" size="sm" onClick={() => handleDelete(cat)}>
    <X className="h-3.5 w-3.5" />
  </Button>
</div>
```

### Widok kategorii -- tryb edycji

```text
<div className="space-y-2 p-3 border rounded-lg border-primary/50">
  <Input value={editName} onChange={...} placeholder="Nazwa grupy" />
  <div className="flex gap-1.5">
    {colorOptions.map(c => <button ... />)}
  </div>
  <Input value={editCommission} onChange={...} placeholder="Prowizja %" type="number" />
  <div className="flex gap-2">
    <Button onClick={handleSaveEdit}><Check /> Zapisz</Button>
    <Button variant="ghost" onClick={cancelEditing}><X /> Anuluj</Button>
  </div>
</div>
```

### Usuwanie (soft delete)

```text
const handleDelete = async (cat: ProductCategory) => {
  await updateCategory.mutateAsync({
    id: cat.id,
    teamId,
    isActive: false,
  });
};
```

## Podsumowanie

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/ProductCategoryManager.tsx` | Tryb edycji inline + przycisk usuwania dla kazdej kategorii |


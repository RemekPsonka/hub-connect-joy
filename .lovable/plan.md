

# Auto-wypelnianie prowizji z grupy produktow

## Problem

Grupy produktow (np. Majatek 20%, Finansowe 18%, Grupowe na zycie 10%) maja juz ustalone domyslne prowizje. Przy dodawaniu produktu pole prowizji jest puste -- uzytkownik musi recznie wpisywac wartosc, ktora i tak jest znana.

## Rozwiazanie

Gdy uzytkownik wybierze grupe produktow z listy rozwijanej, pole "Prowizja (%)" zostanie automatycznie wypelnione wartoscia `default_commission_percent` z wybranej kategorii. Uzytkownik moze ja zmienic przed zapisaniem.

## Zmiana w kodzie

**Plik: `src/components/deals-team/ClientProductsPanel.tsx`**

1. W obsludze `onValueChange` selecta grupy produktow (`setCatId`) -- dodanie logiki, ktora znajduje wybrana kategorie i ustawia `setCommission(String(category.default_commission_percent))` jesli wartosc > 0
2. Wyodrebnienie do funkcji:

```text
const handleCategoryChange = (id: string) => {
  setCatId(id);
  const selected = categories.find(c => c.id === id);
  if (selected && selected.default_commission_percent > 0) {
    setCommission(String(selected.default_commission_percent));
  }
};
```

3. Zamiana `onValueChange={setCatId}` na `onValueChange={handleCategoryChange}` w Select

## Zakres zmian

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/ClientProductsPanel.tsx` | Dodanie `handleCategoryChange` z auto-wypelnianiem prowizji |

Jedna drobna zmiana -- okolo 8 linii kodu.



# Sumowanie wartosci produktow dla wszystkich kategorii

## Problem

Karty statystyk HOT/TOP/LEAD/COLD pokazuja "0 PLN" bo uzywaja pola `estimated_value` z tabeli kontaktow (ktore nie jest wypelniane). Karta "Klienci" dziala poprawnie, bo liczy sume z tabeli produktow (`deal_team_client_products`). Dane produktow sa juz pobierane (`allProducts`, `allContacts`) -- brakuje tylko obliczen per-kategoria.

## Rozwiazanie

W `TeamStats.tsx` dodac obliczenia wartosci produktow per kategoria (HOT, TOP, LEAD, COLD) analogicznie do `clientTotalValue`, i wyswietlic je w odpowiednich kartach.

## Zmiany

**Plik: `src/components/deals-team/TeamStats.tsx`**

1. Dodac `useMemo` obliczajacy sume `deal_value` produktow per kategoria:

```text
const categoryValues = useMemo(() => {
  const values: Record<string, number> = { hot: 0, top: 0, lead: 0, cold: 0 };
  allProducts.forEach((p) => {
    const contact = allContacts.find((c) => c.id === p.team_contact_id);
    if (contact && contact.category in values) {
      values[contact.category] += p.deal_value;
    }
  });
  return values;
}, [allProducts, allContacts]);
```

2. Zaktualizowac karty HOT, TOP, LEAD, COLD -- zamiast `contactStats.total_value` wyswietlac `categoryValues.hot` / `.top` / `.lead` / `.cold`

3. Dodac sekcje "Wartosc" do kart TOP, LEAD, COLD (obecnie maja tylko tekst "Gotowe do awansu" / "W kolejce" / "Do kwalifikacji") -- analogicznie do karty HOT i Klienci

| Karta | Obecna wartosc | Po zmianie |
|---|---|---|
| HOT Leads | `contactStats.total_value` (0 PLN) | `categoryValues.hot` (suma produktow HOT) |
| TOP Leads | brak wartosci | `categoryValues.top` |
| Leads | brak wartosci | `categoryValues.lead` |
| Cold Leads | brak wartosci | `categoryValues.cold` |
| Klienci | `clientTotalValue` | bez zmian |


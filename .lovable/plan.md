

# Konwersja na klienta — wszystkie grupy produktów w jednym oknie

## Problem
Obecny `ConvertToClientDialog` pozwala wybrać tylko **jedną** grupę produktów i podać dla niej wartość składki + prowizję. Klient często ma kilka produktów (np. Majątek + Finansowe + Komunikacja) — trzeba móc je wszystkie wprowadzić od razu.

## Rozwiązanie

Przebudowa `ConvertToClientDialog.tsx` — zamiast pojedynczego selecta + 2 inputów, lista **wszystkich grup produktów zespołu** z polami inline:

```text
┌─ Konwertuj na klienta ─────────────────────────┐
│ Rajmund Mucha                                   │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ● Komunikacja                                │ │
│ │   Składka: [_______] PLN  Prowizja: [__] %  │ │
│ │   = 0 PLN                                    │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ● Majątek                                    │ │
│ │   Składka: [50000_] PLN  Prowizja: [15] %   │ │
│ │   = 7 500 PLN                                │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ● Finansowe                                  │ │
│ │   Składka: [30000_] PLN  Prowizja: [18] %   │ │
│ │   = 5 400 PLN                                │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ● Grupowe na życie                           │ │
│ │   Składka: [_______] PLN  Prowizja: [__] %  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ SUMA: 80 000 PLN składki, 12 900 PLN prowizji  │
│                                                 │
│            [Anuluj]  [✅ Konwertuj]              │
└────────────────────────────────────────────────┘
```

## Logika

- Stan: `Record<categoryId, { dealValue, commissionPercent }>`
- Pola startowo puste; prowizja auto-fill z `default_commission_percent` kategorii przy pierwszej zmianie składki
- Walidacja: **co najmniej jedna** grupa musi mieć `dealValue > 0`
- Zapis: pętla po kategoriach z wypełnioną składką → `addProduct.mutateAsync(...)` dla każdej (sekwencyjnie), potem jeden `convertToClient.mutateAsync(...)`
- Suma składek + suma prowizji wyświetlana na dole dialogu

## Zmiany

### `src/components/deals-team/ConvertToClientDialog.tsx`
- Usunięcie `Select` pojedynczej kategorii
- Dodanie listy wszystkich kategorii z dwoma inputami per wiersz
- Nowy stan `productInputs: Record<string, { value: string; commission: string }>`
- Nowa logika `handleSubmit`: filtruje wypełnione, zapisuje wszystkie produkty
- Wyświetlanie sumy na dole

### Pozostałe pliki
Bez zmian — dialog jest wywoływany w tych samych miejscach (kanban drop, przyciski akcji), API wywołującego się nie zmienia.


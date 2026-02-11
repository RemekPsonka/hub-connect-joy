

# Naprawa bledu: "Identifier 'fullName' has already been declared"

## Problem

Edge function `prospect-ai-brief` nie uruchamia sie z powodu bledu skladni. W pliku sa **zduplikowane deklaracje zmiennych** -- linie 105-108 to pozostalosc starego kodu sprzed refaktoru na `if/else` (deal_contact vs prospect).

Zmienne `fullName`, `company`, `position`, `industry` sa juz zadeklarowane jako `let` w liniach 66-69 i przypisywane w bloku `if/else` (linie 71-103). Linie 105-108 probuaja zadeklarowac je ponownie jako `const` i dodatkowo odwoluja sie do nieistniejacej zmiennej `prospect`.

## Rozwiazanie

Usuniecie linii 105-108 z pliku `supabase/functions/prospect-ai-brief/index.ts`.

### Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `supabase/functions/prospect-ai-brief/index.ts` | Usuniecie zduplikowanych linii 105-108 |


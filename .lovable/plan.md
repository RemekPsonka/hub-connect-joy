

# Naprawa przewijania w modalu "Znajdz i scal duplikaty"

## Problem
`ScrollArea` uzywa `flex-1` bez jawnie okreslnej wysokosci, przez co lista duplikatow rozciaga modal poza ekran i nie mozna go przewinac.

## Rozwiazanie
Zmiana w `src/components/contacts/FindDuplicatesModal.tsx`:

1. Zamiana `ScrollArea` z `flex-1` na wersje z jawna maksymalna wysokoscia (`max-h-[50vh]`) i wlasnym `overflow-y-auto`, co zagwarantuje przewijanie niezaleznie od ilosci grup duplikatow.

2. Alternatywnie: dodanie `overflow-hidden` do sekcji wrappera i ustawienie `min-h-0` na kontenerze flex, aby `flex-1` prawidlowo ograniczal wysokosc.

| Plik | Zmiana |
|------|--------|
| `src/components/contacts/FindDuplicatesModal.tsx` | Linia 169: zmiana `<ScrollArea className="flex-1 -mx-6 px-6">` na `<ScrollArea className="max-h-[50vh] -mx-6 px-6">`. Dodanie `min-h-0` do fragmentu `<>` wrappera (zamiana na `<div className="flex flex-col min-h-0 flex-1">`). |


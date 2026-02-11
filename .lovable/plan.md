

# Naprawa: spinning na wszystkich kontaktach zamiast tylko na jednym

## Problem

`briefMutation.isPending` to **jeden boolean** wspoldzielony przez cala liste. Gdy generujesz brief dla jednego kontaktu, **wszystkie** ikonki sie kreca, bo wszystkie sprawdzaja ten sam stan `isPending`. Brief wykonuje sie poprawnie tylko dla jednego -- ale UI sugeruje ze dla wszystkich.

## Rozwiazanie

Dodanie stanu `generatingBriefId` ktory przechowuje ID aktualnie generowanego prospekta. Spinner pokazuje sie tylko na tym konkretnym wierszu.

### Zmiana w `ProspectingList.tsx`

1. Dodac `const [generatingBriefId, setGeneratingBriefId] = useState<string | null>(null)`
2. Zamiast `briefMutation.mutate(...)` bezposrednio -- wywolac wrapper ktory:
   - Ustawia `setGeneratingBriefId(prospect.id)`
   - Wywoluje `briefMutation.mutateAsync(...)` 
   - W `.finally()` ustawia `setGeneratingBriefId(null)`
3. Zamiast `briefMutation.isPending` -- sprawdzac `generatingBriefId === prospect.id`

### Logika

```text
// Przed (zle):
disabled={briefMutation.isPending}
{briefMutation.isPending ? <Loader2 spin /> : <Sparkles />}

// Po (dobrze):
disabled={generatingBriefId === prospect.id}
{generatingBriefId === prospect.id ? <Loader2 spin /> : <Sparkles />}
```

Dotyczy 5 miejsc w pliku gdzie `briefMutation.isPending` jest uzywane do warunkowego renderowania spinnera lub blokowania przycisku.

### Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/ProspectingList.tsx` | Dodanie `generatingBriefId` state, zamiana `isPending` na porownanie z ID |


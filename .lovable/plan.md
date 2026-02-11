
# Dodanie opcji "Klient" do konwersji prospektów + ujednolicenie dialogu

## Problem

1. W dialogu konwersji prospekta brakuje kategorii **"KLIENT"** -- dostepne sa tylko COLD, LEAD, TOP, HOT
2. `ProspectCard` na Kanbanie uzywa starego dialogu `ConvertProspectDialog`, ktory **nie sprawdza duplikatow** w bazie kontaktow
3. Nowy dialog `ProspectingConvertDialog` (z wyszukiwaniem duplikatow) jest uzywany tylko w zakladce Prospecting

## Rozwiazanie

### 1. Dodanie kategorii "client" do `ProspectingConvertDialog`

Rozszerzenie tablicy kategorii z `['cold', 'lead', 'top', 'hot']` o `'client'`:

```text
{(['cold', 'lead', 'top', 'hot', 'client'] as const).map((cat) => (
  <Button ...>
    {cat === 'client' ? 'KLIENT' : cat.toUpperCase()}
  </Button>
))}
```

Gdy uzytkownik wybierze "KLIENT", kontakt zostanie dodany do zespolu ze statusem `'won'` (jak w istniejacym `useConvertToClient`).

### 2. Zamiana dialogu w `ProspectCard` (Kanban)

`ProspectCard` zostanie przemigrowany ze starego `ConvertProspectDialog` na nowy `ProspectingConvertDialog`, ktory:
- Automatycznie wyszukuje duplikaty po imieniu/nazwisku
- Pozwala scalic z istniejacym kontaktem lub utworzyc nowy
- Sprawdza czy kontakt juz jest dodany do zespolu
- Tworzy automatycznie arkusz BI z briefem AI

### 3. Logika statusu dla kategorii "client"

W `handleConvert` w `ProspectingConvertDialog`, jesli wybrana kategoria to `'client'`:
- Ustawic `status: 'won'` zamiast domyslnego `'active'`
- Zachowac reszte logiki (duplikaty, BI, brief) bez zmian

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Dodanie 'client' do kategorii, obsluga statusu 'won' dla klientow |
| `src/components/deals-team/ProspectCard.tsx` | Zamiana `ConvertProspectDialog` na `ProspectingConvertDialog` z duplikacja |

## Uwagi

- Typ `DealCategory` w `src/types/dealTeam.ts` juz zawiera `'client'` -- bez zmian
- Hook `useTeamClients` juz obsluguje `category: 'client'` -- bez zmian
- Stary `ConvertProspectDialog` pozostaje w kodzie (moze byc uzywany gdzie indziej), ale `ProspectCard` przestanie go uzywac

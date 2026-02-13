
# Poprawka gornego menu -- problem z szerokoscia

## Problem

Pasek naglowka (TeamSelector + przycisk Statusy + Tabs z zakladkami) nie miesci sie w jednym wierszu. TeamSelector i przycisk "Statusy" zajmuja sporo miejsca, a Tabs z 9 zakladkami jest zbyt szeroki -- elementy wychodza poza ekran (widac uciete "tatusy 107" po lewej stronie).

## Rozwiazanie

Rozdzielic naglowek na **dwa wiersze**:
- **Wiersz 1**: TeamSelector (lewo) + przycisk Statusy + przycisk "+" (prawo)
- **Wiersz 2**: Tabs z zakladkami na pelna szerokosc z `overflow-x-auto`

Dzieki temu zakladki beda mialy pelna szerokosc kontenera, a nie tylko to co zostanie po TeamSelector i Statusy.

## Szczegoly techniczne

### Plik: `src/pages/DealsTeamDashboard.tsx`

Zmiana struktury sekcji Header (linie 130-202):

**Obecna struktura:**
```
flex-row
  ├── TeamSelector
  └── flex-row
        ├── Button "Statusy"
        ├── div overflow-x-auto
        │     └── Tabs (9 zakladek)
        └── Button "+"
```

**Nowa struktura:**
```
flex-col gap-4
  ├── flex-row justify-between
  │     ├── TeamSelector
  │     └── flex-row
  │           ├── Button "Statusy"
  │           └── Button "+"
  └── div overflow-x-auto w-full
        └── Tabs (9 zakladek)
```

Konkretne zmiany:
- Przeniesienie `Tabs` na osobny wiersz pod TeamSelector
- Usuniecie `max-w-[calc(100vw-300px)]` -- zakladki beda mialy pelna szerokosc
- Dodanie `w-full overflow-x-auto` do kontenera z Tabs
- Przycisk "+" pozostaje obok "Statusy" w gornym wierszu

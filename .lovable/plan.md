
# Poprawa widocznosci przycisku rozwijania sidebara

## Problem

Sidebar jest zwinity do trybu ikon, a przycisk rozwijania (`SidebarTrigger`) w headerze jest malo widoczny lub trudny do znalezienia.

## Rozwiazanie

Przycisk `SidebarTrigger` juz istnieje w `HeaderBar.tsx` (linia 36) i powinien dzialac. Jednak moze byc slabo widoczny. Rozwiazanie:

1. Poprawic styl `SidebarTrigger` w headerze, dodajac wyrazniejszy styl (wiekszy rozmiar, lepsza widocznosc).
2. Opcjonalnie dodac tooltip "Rozwin menu" dla lepszej odkrywalnosci.

## Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/layout/HeaderBar.tsx` | Dodac klasy stylu do `SidebarTrigger` -- np. `className="h-9 w-9"` oraz tooltip |

## Szczegoly techniczne

W `HeaderBar.tsx`, linia 36:

```text
// Przed:
<SidebarTrigger />

// Po:
<SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground" />
```

To jedna mala zmiana -- przycisk hamburger/panel w lewym gornym rogu headera bedzie bardziej widoczny i pozwoli rozwinac sidebar po kliknieciu.

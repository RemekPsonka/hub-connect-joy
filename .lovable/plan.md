
# Naprawa widocznosci przyciskow zadaniowych w panelu bocznym kontaktu

## Problem
Przycisk "+ Nowe" istnieje w kodzie, ale jest w wariancie `ghost` (prawie niewidoczny). Brakuje tez wyraznego przycisku edycji przy kazdym zadaniu na liscie. Uzytkownik nie widzi elementow sterujacych.

## Rozwiazanie

Zmiany w jednym pliku: `src/components/deals-team/DealContactDetailSheet.tsx`

### 1. Przycisk "+ Nowe zadanie" - zmiana na widoczny

Zmiana przycisku z `variant="ghost"` na `variant="outline"` z wyrazniejszym stylem:

```
Przed:  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
Po:     <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1">
```

### 2. Dodanie przycisku edycji (olowek) przy kazdym zadaniu

Przy kazdym zadaniu na liscie (obok ikony statusu i tytulu) dodanie malego przycisku edycji (ikona `Pencil`), ktory otwiera `TaskModal` z danymi zadania:

```tsx
<button onClick={(e) => {
  e.stopPropagation();
  setSelectedTask(task);
  setTaskModalOpen(true);
}}>
  <Pencil className="h-3 w-3" />
</button>
```

### 3. Import ikony Pencil

Dodanie `Pencil` do importu z `lucide-react`.

### 4. Wizualna poprawa sekcji ZADANIA

- Przycisk "+ Nowe zadanie" bedzie miał ramke (outline) zamiast byc niewidoczny (ghost)
- Kazde zadanie na liscie bedzie mialo ikone olowka po najechaniu (opacity-0 group-hover:opacity-100)
- Ikony statusu (Circle/Clock/CheckCircle2) beda wieksze i bardziej widoczne

## Szczegoly techniczne

| Zmiana | Linie | Opis |
|--------|-------|------|
| Import Pencil | ~7-12 | Dodanie `Pencil` do importu z lucide-react |
| Przycisk "+ Nowe" | ~476-484 | Zmiana variant z ghost na outline, dodanie tekstu "Nowe zadanie" |
| Przycisk edycji w wierszu | ~489-529 | Dodanie ikony Pencil z handlerem otwierajacym TaskModal |
| Hover effect | ~491 | Dodanie klasy `group` do wiersza zadania |

Nie sa wymagane nowe zaleznosci ani zmiany w bazie danych.

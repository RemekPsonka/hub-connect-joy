

# Naprawa: Kalendarz w panelu szczegolowym zadania nie reaguje na klikniecie

## Problem
Popover z kalendarzem (DayPicker) otwiera sie poprawnie w panelu bocznym zadania (Sheet), ale klikniecie na dzien nie wywoluje zadnej akcji — data nie jest zapisywana, kalendarz nie zamyka sie. Przyczyna: Sheet (Radix Dialog) przechwytuje focus i blokuje interakcje z elementami renderowanymi przez Portal Popovera poza drzewem DOM Sheeta.

## Rozwiazanie

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

Zamiana standardowego `PopoverContent` (ktory uzywa Portal) na wersje renderowana bez Portala, bezposrednio w drzewie DOM Sheeta. Dzieki temu focus trap Sheeta nie blokuje klikniec w kalendarz.

Konkretnie:
- Zaimportowac `PopoverPrimitive` z `@radix-ui/react-popover`
- Zamiast `<PopoverContent>` uzyc `<PopoverPrimitive.Content>` (bez Portal) z odpowiednimi stylami i `pointer-events-auto`
- Dodac `try/catch` wokol `updateTask.mutateAsync` dla bezpieczenstwa
- Po wybraniu daty zamknac popover ustawiajac stan `open`

### Szczegoly techniczne

```text
// Zamiast:
<PopoverContent className="w-auto p-0 z-50" align="start">
  <DayPickerCalendar ... />
</PopoverContent>

// Uzyc:
<PopoverPrimitive.Content
  align="start"
  sideOffset={4}
  className="z-[100] w-auto rounded-md border bg-popover p-0 shadow-md pointer-events-auto"
  onOpenAutoFocus={(e) => e.preventDefault()}
>
  <DayPickerCalendar ... />
</PopoverPrimitive.Content>
```

To eliminuje Portal i renderuje kalendarz wewnatrz Sheeta, co rozwiazuje problem z przechwytywaniem focusu.

### Pliki do zmiany:
1. **`src/components/tasks/TaskDetailSheet.tsx`** — zamiana PopoverContent na PopoverPrimitive.Content bez Portala + dodanie obslugi bledow w `onSelect`



# Wymuszenie terminu przy tworzeniu zadania w lejku

## Problem
Obecnie mozna dodac zadanie bez ustawienia terminu ("Termin"). Uzytkownik chce, aby termin byl wymagany -- nie mozna utworzyc taska bez wybrania daty.

## Rozwiazanie

### Plik: `src/components/deals-team/ContactTasksSheet.tsx`

1. **Zablokowanie przyciskow szablonow gdy brak terminu** -- dodac `disabled={!taskDueDate || createTask.isPending}` do kazdego przycisku szablonu ("Umow spotkanie", "Zadzwon", "Wyslij oferte", "Wyslij mail") oraz do przycisku "+ Inne".

2. **Zablokowanie formularza "Inne"** -- w `onSubmit` dodac warunek `if (!taskDueDate)` z komunikatem toast `toast.error('Ustaw termin zadania')` i wczesnym returnem.

3. **Wizualne podpowiedzi** -- jesli `taskDueDate` nie jest ustawiony:
   - Przycisk "Termin" bedzie mial delikatne czerwone obramowanie (`border-red-300`) jako podpowiedz, ze jest wymagany
   - Przyciski szablonow beda szare (disabled), wiec uzytkownik od razu widzi, ze cos trzeba ustawic

### Szczegoly techniczne

Zmiany w jednym pliku:
- **`src/components/deals-team/ContactTasksSheet.tsx`**
  - Linia ~337-341: dodac `disabled={!taskDueDate || createTask.isPending}` do przyciskow szablonow
  - Linia ~365-376: dodac `disabled={!taskDueDate || createTask.isPending}` do przycisku "+ Inne"
  - Linia ~383-385: dodac walidacje `if (!taskDueDate) { toast.error('Ustaw termin'); return; }`
  - Linia ~306-310: dodac warunkowa klase `border-red-300` do przycisku Termin gdy `!taskDueDate`

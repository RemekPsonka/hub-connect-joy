

## Plan: Naprawa błędu dodawania zadań

### Problem zidentyfikowany

Podczas otwierania modalu "Nowe zadanie" aplikacja crashuje z błędem:
```
Error: A <Select.Item /> must have a value prop that is not an empty string.
```

### Przyczyna

W pliku `src/components/tasks/TaskModal.tsx` znajdują się dwa elementy `<SelectItem>` z pustym `value=""`:
- **Linia 284**: `<SelectItem value="">Brak kategorii</SelectItem>`
- **Linia 345**: `<SelectItem value="">Ja ({currentDirector?.full_name})</SelectItem>`

Radix UI Select **nie pozwala** na puste wartości w `<SelectItem>`, ponieważ pusty string jest zarezerwowany do czyszczenia selekcji.

### Rozwiązanie

Zmienić puste wartości na specjalne znaczniki:
- `""` → `"none"` (dla kategorii)
- `""` → `"self"` (dla przypisania)

Następnie zaktualizować logikę `handleSubmit` aby traktować te wartości jako `null` lub `undefined`.

---

## Szczegóły techniczne

### Plik: `src/components/tasks/TaskModal.tsx`

#### Zmiana 1: Kategoria - wartość SelectItem
```tsx
// Przed (linia 284):
<SelectItem value="">Brak kategorii</SelectItem>

// Po:
<SelectItem value="none">Brak kategorii</SelectItem>
```

#### Zmiana 2: Przypisanie - wartość SelectItem
```tsx
// Przed (linia 345):
<SelectItem value="">Ja ({currentDirector?.full_name})</SelectItem>

// Po:
<SelectItem value="self">Ja ({currentDirector?.full_name})</SelectItem>
```

#### Zmiana 3: Aktualizacja handleSubmit (linia ~177-222)
Zmienić logikę przekazywania wartości:
```tsx
// Zamiast:
categoryId: categoryId || undefined,
assignedTo: assignedTo || undefined,

// Na:
categoryId: categoryId === 'none' ? undefined : (categoryId || undefined),
assignedTo: assignedTo === 'self' ? undefined : (assignedTo || undefined),
```

#### Zmiana 4: Aktualizacja useEffect przy edycji (linia ~88-145)
Zmienić inicjalizację wartości:
```tsx
// Zamiast:
setCategoryId(task.category_id || '');
setAssignedTo(task.assigned_to || '');

// Na:
setCategoryId(task.category_id || 'none');
setAssignedTo(task.assigned_to || 'self');
```

---

## Podsumowanie zmian

| Plik | Zmiany |
|------|--------|
| `src/components/tasks/TaskModal.tsx` | 4 zmiany w obsłudze wartości Select |

### Oczekiwany rezultat
Po naprawie:
1. Modal "Nowe zadanie" otworzy się poprawnie
2. Użytkownik będzie mógł tworzyć zadania
3. Opcje "Brak kategorii" i "Ja" będą działać prawidłowo


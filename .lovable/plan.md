
# Szybkie tworzenie taskow z szablonami w Kanban deals

## Problem
Przy tworzeniu zadania z poziomu ContactTasksSheet (panel boczny kontaktu na Kanban):
1. Brak szybkich opcji jak "Umow spotkanie", "Zadzwon", "Wyslij oferte"
2. Task tworzony z generycznym tytulem "Nowe zadanie" — uzytkownik nie wie co sie stalo
3. Przycisk "Zapisz" w panelu szczegolow wyglada na nieaktywny, bo task juz zostal zapisany w tle

## Rozwiazanie

### 1. Dodanie szybkich szablonow zadan w `ContactTasksSheet.tsx`

Zamiast jednego przycisku "Nowe zadanie", dodac sekcje z szybkimi akcjami:

```text
[Umow spotkanie] [Zadzwon] [Wyslij oferte] [Wyslij mail] [+ Inne]
```

Kazdy przycisk tworzy task z konkretnym tytulem:
- "Umow spotkanie" -> tytul: "Umowic spotkanie z {nazwa_kontaktu}"
- "Zadzwon" -> tytul: "Zadzwonic do {nazwa_kontaktu}"
- "Wyslij oferte" -> tytul: "Wyslac oferte do {nazwa_kontaktu}"
- "Wyslij mail" -> tytul: "Wyslac maila do {nazwa_kontaktu}"
- "+ Inne" -> otwiera pole tekstowe do wpisania wlasnego tytulu

Po kliknieciu szybkiej akcji:
- Task tworzony od razu z odpowiednim tytulem
- Toast "Zadanie dodane: Umowic spotkanie z Jan Kowalski"
- Task pojawia sie na liscie zadan kontaktu (bez otwierania panelu szczegolow)
- Uzytkownik moze kliknac na zadanie jesli chce dodac wiecej szczegolow

### 2. Przycisk "+ Inne" z polem tekstowym

Klikniecie "+ Inne" rozwija inline input (podobnie jak `KanbanInlineCreate`):
- Pole tekstowe z autofocusem
- Enter = zapisz, Escape = anuluj
- Po zapisaniu — toast z potwierdzeniem

### Pliki do zmiany:
1. **`src/components/deals-team/ContactTasksSheet.tsx`** — zastapienie przycisku "Nowe zadanie" sekcja szybkich akcji z szablonami + inline input dla wlasnego tytulu

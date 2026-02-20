
# Oznaczenie zadan lejkowych na stronie Zadania

## Diagnoza
Zadania tworzone z poziomu lejka SGU **poprawnie zapisuja `deal_team_id` w bazie danych** — problem nie lezy w tworzeniu, lecz w wyswietlaniu. Komponent `UnifiedTaskRow` nie pokazuje zadnej informacji o przynaleznosci do lejka, przez co zadania lejkowe wygladaja identycznie jak ogolne.

## Rozwiazanie

### 1. Plik: `src/hooks/useTasks.ts` — wzbogacenie query o dane zespolu

Rozszerzyc select w glownym uzyciu `useTasks` o relacje `deal_teams`, aby pobierac nazwe i kolor zespolu:

```text
deal_team:deal_teams(id, name, color)
```

Dodac pole `deal_team` do typu `TaskWithDetails`.

### 2. Plik: `src/components/tasks/UnifiedTaskRow.tsx` — badge lejka

Dodac maly badge obok tytulu zadania, jesli `task.deal_team_id` jest ustawione. Badge powinien:
- Wyswietlac nazwe zespolu (np. "SGU") w kolorze zespolu
- Byc maly i nieinwazyjny (text-xs, rounded-full)
- Pojawiac sie miedzy statusem a tytulem

### Pliki do zmiany:
1. **`src/hooks/useTasks.ts`** — dodanie relacji `deal_teams` do selecta w `useTasks()` + aktualizacja typu
2. **`src/components/tasks/UnifiedTaskRow.tsx`** — wyswietlenie badge z nazwa lejka obok tytulu zadania

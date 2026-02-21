

# Naprawa pelnego flow "dalsze dzialania" w lejku

## Zidentyfikowane problemy

### 1. Brak przekazania callbackow `onSnooze` i `onConvertToClient`
`ContactTasksSheet` (linie 638-652) renderuje `NextActionDialog` ale NIE przekazuje `onSnooze` ani `onConvertToClient`. Dlatego klikniecie "Odloz" lub "Klient" w dialogu nic nie robi -- callback jest `undefined`.

### 2. Przyciski szybkiego dodawania tworza duplikaty
Przyciski "Umow spotkanie", "Zadzwon", "Wyslij oferte", "Wyslij mail" (linie 376-432) uzywaja `createTask.mutateAsync()` -- czyli tworza NOWE zadanie za kazdym razem. Powinny byc uzywane TYLKO jesli kontakt nie ma jeszcze zadnego aktywnego zadania.

### 3. Brak stanu dla SnoozeDialog i ConvertToClientDialog
`ContactTasksSheet` nie ma zmiennych stanu (`showSnooze`, `showConvert`) ani nie renderuje tych dialogow.

## Plan naprawy

### Plik 1: `src/components/deals-team/ContactTasksSheet.tsx`

**A) Dodac stany i renderowanie SnoozeDialog + ConvertToClientDialog:**
```typescript
const [showSnooze, setShowSnooze] = useState(false);
const [showConvert, setShowConvert] = useState(false);
```

**B) Przekazac callbacki do NextActionDialog:**
```typescript
<NextActionDialog
  ...
  onSnooze={() => setShowSnooze(true)}
  onConvertToClient={() => setShowConvert(true)}
/>
```

**C) Renderowac SnoozeDialog i ConvertToClientDialog pod NextActionDialog.**

**D) Zablokowac przyciski szybkiego dodawania jesli istnieje aktywne zadanie:**
Jesli `openTasks.length > 0` -- ukryc przyciski szybkiego dodawania lub wyswietlic komunikat "Zakoncz biezace zadanie zeby dodac nastepne". Jedno zadanie na kontakt.

### Plik 2: `src/components/deals-team/NextActionDialog.tsx`
- Bez zmian -- logika jest poprawna, brakuje tylko callbackow z rodzica.

### Pliki do zmiany:
1. `src/components/deals-team/ContactTasksSheet.tsx` -- dodanie SnoozeDialog, ConvertToClientDialog, przekazanie callbackow, blokada duplikatow


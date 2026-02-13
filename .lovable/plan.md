
# Naprawy scrollowania i widocznosci w formularzach Deals

## Zidentyfikowane problemy

### 1. ScrollArea w WeeklyStatusForm nie scrolluje
Komponent `ScrollArea` wymaga jawnej wysokosci (np. `max-h-[60vh]`), a obecnie ma tylko `flex-1` co nie zawsze daje poprawna wysokosc. Formularz jest dluzszy niz okno dialogowe i dolna czesc (zadania, rekomendacja kategorii, przyciski) jest ucieta.

**Rozwiazanie:** Zamienic `ScrollArea` na zwykly `div` z `overflow-y-auto` i `max-h-[60vh]`, co zapewni natywne scrollowanie.

### 2. Sekcja zadan domyslnie ukryta w statusie
Stan `createTask` domyslnie `false` — uzytkownik moze nie zauwazac ze ta sekcja istnieje.

**Rozwiazanie:** Zmienic domyslna wartosc `createTask` na `true` (tak samo jak w ProspectingConvertDialog).

### 3. Sidebar - link "Zadania zespolu" niewidoczny
Link jest w sekcji "Sprzedaz" ktora wymaga scrollowania sidebara. To nie jest bug — sidebar ma wiele sekcji. Nie wymaga zmian.

## Szczegoly techniczne

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/WeeklyStatusForm.tsx` | Zamiana `ScrollArea` na `div` z `overflow-y-auto max-h-[60vh]`; zmiana `createTask` domyslnie na `true` |

### Konkretne zmiany

**Linia 96** — zmiana domyslnej wartosci:
```
// BYLO:
const [createTask, setCreateTask] = useState(false);
// BEDZIE:
const [createTask, setCreateTask] = useState(true);
```

**Linia 136** — reset tez na `true`:
```
setCreateTask(true);
```

**Linia 255** — zamiana ScrollArea na div:
```
// BYLO:
<ScrollArea className="flex-1 -mx-6 px-6">
// BEDZIE:
<div className="overflow-y-auto -mx-6 px-6" style={{ maxHeight: '60vh' }}>
```

**Zamkniecie tagu** (koniec ScrollArea) — analogicznie na `</div>`.

Usuniecie importu `ScrollArea` jesli nie jest uzywany nigdzie indziej.

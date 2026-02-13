

# Dodanie linków do zadań zespołowych w nawigacji

## Co się zmieni

### 1. Menu główne (AppSidebar) -- nowy link w sekcji "Sprzedaż"

Dodanie pozycji **"Zadania zespołu"** w sekcji `salesItems`, kierującej na `/deals-team` z automatycznym przełączeniem na zakładkę "Zadania":

```text
Sprzedaż
  Deals
  Zespół Deals
  Zadania zespołu   <-- NOWY (ikona ClipboardList, url: /deals-team?view=tasks)
  Ofertowanie
  Dopasowania
```

### 2. Widok DealsTeamDashboard -- link do "Moje zadania"

W headerze widoku `/deals-team`, obok przycisków Kanban/Tabela/Prospecting, zakładka "Zadania" już istnieje w TabsList. Natomiast dodamy obsługę query parametru `?view=tasks`, żeby link z menu głównego automatycznie otwierał zakładkę zadań.

## Szczegóły techniczne

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Dodanie "Zadania zespołu" do `salesItems` z url `/deals-team?view=tasks` + import `ClipboardList` |
| `src/pages/DealsTeamDashboard.tsx` | Odczyt query param `view` z URL i ustawienie początkowego `viewMode` na jego podstawie |

### AppSidebar.tsx

- Import `ClipboardList` z `lucide-react`
- Dodanie do tablicy `salesItems`:
  ```
  { title: 'Zadania zespołu', url: '/deals-team?view=tasks', icon: ClipboardList }
  ```

### DealsTeamDashboard.tsx

- Import `useSearchParams` z `react-router-dom`
- Odczyt `searchParams.get('view')` do ustawienia domyślnego `viewMode`
- Jeśli URL zawiera `?view=tasks`, widok startuje od razu na zakładce "Zadania"

Zero migracji SQL, zero nowych komponentów.

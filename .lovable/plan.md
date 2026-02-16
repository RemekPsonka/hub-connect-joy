
# Edycja roli kontaktu + filtrowanie po kategorii z licznikami

## Problem
1. Nie mozna zmienic roli (np. "Zarzad", "Kapitula") po dodaniu kontaktu do projektu
2. Brak filtrowania po roli/kategorii
3. Brak informacji ile osob jest w danej kategorii

## Zmiany

### 1. Nowy hook `useUpdateProjectContact` w `src/hooks/useProjects.ts`
Mutacja UPDATE na tabeli `project_contacts` -- zmiana pola `role_in_project` po ID rekordu. Invalidacja `['project-contacts', projectId]`.

### 2. Edycja roli inline w `ProjectContactsTab.tsx`
- Klikniecie na Badge z rola (np. "Zarzad") otwiera maly Popover z polem Input i przyciskiem "Zapisz"
- Jesli kontakt nie ma roli -- wyswietla przycisk "Dodaj role" (maly link/przycisk)
- Po zapisie -- natychmiastowe odswiezenie listy

### 3. Filtrowanie po kategorii (roli)
- Nad lista kontaktow -- pasek z przyciskami filtrowania (kazda unikalna rola jako chip/badge)
- Kazdy chip pokazuje liczbe osob: np. `Zarzad (5)` `Kapitula (4)` `Wszyscy (25)`
- Klikniecie w chip filtruje liste
- Domyslnie wybrany "Wszyscy"

### 4. Uklad komponentu (po zmianach)
```text
Kontakty projektu (25)                    [+ Dodaj kontakt]
[Wszyscy (25)] [Zarzad (5)] [Kapitula (4)] [Inne (16)]
------------------------------------------------------------
AL  Artur Lewandowski / Wlasciciel    [Zarzad ▼]  [->] [x]
```

## Szczegoly techniczne

### `src/hooks/useProjects.ts`
Dodanie:
```typescript
export function useUpdateProjectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roleInProject, projectId }) => {
      await supabase.from('project_contacts')
        .update({ role_in_project: roleInProject })
        .eq('id', id);
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project-contacts', projectId] });
    },
  });
}
```

### `src/components/projects/ProjectContactsTab.tsx`
- Import `useUpdateProjectContact`
- Dodanie stanu `roleFilter` (string | null, domyslnie null = wszystkie)
- Obliczenie `roleCounts` -- Map z rola -> liczba kontaktow
- Pasek filtrow nad lista (render unikalnych rol jako badge z licznikiem)
- Przy kazdym kontakcie -- Badge z rola klikalne, otwiera Popover z Input do zmiany
- Filtrowanie listy kontaktow po wybranej roli

### Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| `src/hooks/useProjects.ts` | Nowy hook `useUpdateProjectContact` |
| `src/components/projects/ProjectContactsTab.tsx` | Filtrowanie, liczniki, edycja roli inline |


# Dodanie mozliwosci zmiany osoby odpowiedzialnej za zadanie

## Opis
Wiersz "Osoba odpowiedzialna" w panelu bocznym zadania (TaskDetailSheet) jest obecnie statyczny -- wyswietla imie, ale nie pozwala na zmiane. Plan zamienia go na interaktywny dropdown, pozwalajacy wybrac dowolnego czlonka zespolu na kazdym etapie.

## Plan techniczny

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

1. **Import `useTeamMembers`** z `@/hooks/useDealsTeamMembers` oraz `useDirectors` z `@/hooks/useDirectors` (fallback dla zadan nie-lejkowych).

2. **Pobranie listy czlonkow** -- w komponencie `TaskDetailSheetContent`:
   - Dla zadan lejkowych (`isPipelineTask`): `useTeamMembers(pipelineTeamId)`
   - Dla pozostalych zadan: `useDirectors()` (wszyscy dyrektorzy w tenancie)

3. **Zamiana statycznego wiersza "Osoba odpowiedzialna"** (linie 628-636) na interaktywny `DropdownMenu`:
   - Trigger: przycisk z ikonka User + imie aktualnie przypisanej osoby + ChevronDown
   - Content: lista czlonkow zespolu (lub directorow) z opcja "Nieprzypisane"
   - Styl: identyczny jak istniejace dropdowny (Priorytet, Status) -- `hover:bg-muted/50 rounded px-1.5 py-0.5`

4. **Obsluga zmiany** -- `handleAssigneeChange(directorId: string | null)`:
   - Wywolanie `updateTask.mutateAsync({ id: task.id, assigned_to: directorId })`
   - Natychmiastowa aktualizacja UI

5. **Widocznosc wiersza** -- wiersz jest zawsze widoczny (nie tylko gdy `owner || assignee`), aby mozna bylo przypisac osobe do zadan, ktore jeszcze nie maja opiekuna.

### Przyklad kodu nowego wiersza:

```text
<MetaRow label="Osoba odpowiedzialna">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{assignee?.full_name || owner?.full_name || 'Nieprzypisane'}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="min-w-[200px]">
      <DropdownMenuItem onClick={() => handleAssigneeChange(null)}>
        <User className="h-3.5 w-3.5 mr-2 opacity-50" />
        Nieprzypisane
      </DropdownMenuItem>
      {availableMembers.map(m => (
        <DropdownMenuItem key={m.id} onClick={() => handleAssigneeChange(m.id)}>
          <User className="h-3.5 w-3.5 mr-2" />
          {m.full_name}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</MetaRow>
```

### Modyfikowane pliki
- `src/components/tasks/TaskDetailSheet.tsx` -- jedyny plik do zmiany

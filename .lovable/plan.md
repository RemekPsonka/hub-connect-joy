
# Wyswietlanie powiazanego kontaktu w panelu szczegolów zadania

## Problem
Panel szczegolów zadania (TaskDetailSheet) nie pokazuje, z jakim kontaktem jest powiazane zadanie. Uzytkownik widzi wiele zadan o tej samej nazwie (np. "Umowic spotkanie") i nie wie, ktorego kontaktu dotycza.

## Rozwiazanie

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

Dodac wiersz "Kontakt" w sekcji metadanych (zaraz pod "Osoba odpowiedzialna"), ktory:
- Wyswietla imie i nazwisko kontaktu z `task.task_contacts[0]`
- Wyswietla nazwe firmy (jesli istnieje) obok imienia
- Jest klikalny -- przekierowuje do strony kontaktu (`/contacts/{id}`)
- Jesli brak powiazanego kontaktu, wiersz sie nie wyswietla

Dane sa juz dostepne w obiekcie `task.task_contacts` (pobierane przez `useTasks`), wiec nie trzeba dodawac nowych zapytan.

### Szczegoly techniczne

W komponencie `TaskDetailSheet`, po wierszu "Osoba odpowiedzialna" (linia ~362), dodac nowy `MetaRow` z etykieta "Kontakt":

```
{task.task_contacts?.length > 0 && (
  <MetaRow label="Kontakt">
    <div className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
         onClick={() => navigate(`/contacts/${task.task_contacts[0].contacts.id}`)}>
      <User className="h-3.5 w-3.5" />
      <span>{task.task_contacts[0].contacts.full_name}</span>
      {task.task_contacts[0].contacts.company && (
        <span className="text-muted-foreground">({task.task_contacts[0].contacts.company})</span>
      )}
    </div>
  </MetaRow>
)}
```

### Pliki do zmiany:
- `src/components/tasks/TaskDetailSheet.tsx` -- dodanie wiersza "Kontakt" w metadanych

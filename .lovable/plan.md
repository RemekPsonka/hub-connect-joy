
# Dialog "Znam te osobe" -- lista dyrektorow + opcja "Inny"

## Cel
Po kliknieciu "Znam te osobe!" uzytkownik widzi najpierw liste dyrektorow z organizacji. Moze wybrac jednego dyrektora (ktory zna te osobe), albo kliknac "Inny" zeby przeszukac baze CRM.

## Zmiany w `src/components/wanted/MatchWantedDialog.tsx`

### Nowy flow:
1. Dialog otwiera sie z lista dyrektorow (z `useDirectors()`) jako przyciski/karty
2. Na dole opcja **"Inny -- szukaj w CRM"**
3. Po kliknieciu dyrektora -- od razu `matchMutation.mutate()` z ID kontaktu powiazanego z dyrektorem (wymaga dociagniecia `contact_id` dyrektora)
4. Po kliknieciu "Inny" -- przelaczenie na widok `ConnectionContactSelect` (obecny flow)

### Szczegoly techniczne:

**Stan:**
- `mode: 'directors' | 'crm'` -- przelaczanie miedzy widokami
- `contactId` -- wybrany kontakt (uzywany w trybie CRM)

**Tryb "directors":**
```tsx
const { data: directors = [] } = useDirectors();

{directors.map(d => (
  <Button key={d.id} variant="outline" className="justify-start gap-2"
    onClick={() => handleDirectorMatch(d)}>
    <User className="h-4 w-4" />
    {d.full_name}
  </Button>
))}
<Button variant="ghost" onClick={() => setMode('crm')}>
  Inny -- szukaj w CRM
</Button>
```

**Problem**: Dyrektorzy nie maja bezposrednio `contact_id`. Trzeba znalezc kontakt w tabeli `contacts` po emailu lub imieniu dyrektora. Ale latwiej: dyrektorzy sami w sobie nie sa kontaktami CRM -- raczej chodzi o to, ze dyrektor "zna" poszukiwana osobe i wskazuje ja z CRM.

**Reinterpretacja**: Uzytkownik chce wybrac **ktory dyrektor zna te osobe** (matched_by), a nastepnie opcjonalnie wskazac kontakt z CRM. Ale z kodu wynika, ze `matched_by` to juz aktualny uzytkownik...

**Najprostsza interpretacja**: Lista dyrektorow sluzy jako szybki wybor -- kazdy dyrektor moze byc rowniez kontaktem w CRM. Wiec:
1. Pokazac dyrektorow jako skroty
2. Po kliknieciu dyrektora -- wyszukac jego kontakt w CRM po emailu i uzyc jako `matched_contact_id`
3. "Inny" -- standardowy ConnectionContactSelect

**Implementacja `handleDirectorMatch`:**
- Wyszukaj kontakt po `email = director.email` w tabeli `contacts`
- Jesli znaleziony -- dopasuj
- Jesli nie -- pokaz toast "Dyrektor nie ma kontaktu w CRM" i przelacz na tryb CRM

### Przyciski w trybie CRM:
- "Wstecz" -- wroc do listy dyrektorow
- "Dopasuj" -- jak teraz

## Pliki do zmiany
1. `src/components/wanted/MatchWantedDialog.tsx` -- nowy dwuetapowy flow

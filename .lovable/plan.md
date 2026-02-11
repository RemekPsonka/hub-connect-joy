

# Panel DEALS na stronie szczegolów kontaktu

## Cel

Dodanie panelu "DEALS" na gorze strony kontaktu (`ContactDetail.tsx`), ktory:
- Pokazuje w jakich zespolach Deals i na jakim etapie lejka znajduje sie kontakt (HOT/TOP/LEAD/COLD/CLIENT)
- Umozliwia szybkie dodanie kontaktu do wybranego zespolu Deals z wyborem kategorii
- Umozliwia oznaczenie jako klient w danej grupie

## Nowy komponent

### `src/components/contacts/ContactDealsPanel.tsx`

Panel wyswietlany pomiedzy `ContactDetailHeader` a przyciskami OSOBA/FIRMA.

**Sekcja informacyjna:**
- Pobiera dane z `deal_team_contacts` po `contact_id` (nowy hook lub inline query)
- Dla kazdego powiazania wyswietla: nazwa zespolu, kategoria (badge kolorowy HOT/TOP/LEAD/COLD/CLIENT), status
- Jesli kontakt nie jest w zadnym lejku -- komunikat "Brak przypisania do lejka"

**Akcje:**
- Przycisk "Dodaj do Deals" -- otwiera maly dialog z:
  - Dropdown wyboru zespolu Deals (z `useDealTeams`)
  - Dropdown wyboru kategorii (COLD/LEAD/TOP/HOT/CLIENT)
  - Przycisk "Dodaj"
- Korzysta z istniejacego hooka `useAddContactToTeam` z `useDealsTeamContacts.ts`

## Nowy hook

### `src/hooks/useContactDealTeams.ts`

Prosty hook zwracajacy liste przypisanych zespolow Deals dla danego `contactId`:

```text
SELECT dtc.*, dt.name as team_name, dt.color as team_color
FROM deal_team_contacts dtc
JOIN deal_teams dt ON dtc.team_id = dt.id
WHERE dtc.contact_id = ?
```

## Modyfikacja istniejacych plikow

| Plik | Zmiana |
|---|---|
| `src/pages/ContactDetail.tsx` | Import i renderowanie `ContactDealsPanel` miedzy headerem a przyciskami OSOBA/FIRMA |
| `src/hooks/useContactDealTeams.ts` | Nowy plik -- hook do pobierania deal team memberships kontaktu |
| `src/components/contacts/ContactDealsPanel.tsx` | Nowy plik -- komponent panelu DEALS |

## Szczegoly techniczne

### ContactDealsPanel -- struktura

- Kompaktowy panel w stylu `DataCard` lub prosty `div` z borderem
- Naglowek: ikona + "DEALS" + przycisk "Dodaj do Deals"
- Lista przypisanych zespolow jako badge'e: `[Zespol A - HOT] [Zespol B - CLIENT]`
- Klikniecie badge otwiera link do dashboardu zespolu

### useContactDealTeams hook

```text
useQuery({
  queryKey: ['contact-deal-teams', contactId],
  queryFn: async () => {
    const { data } = await supabase
      .from('deal_team_contacts')
      .select('id, team_id, category, status, deal_teams(name, color)')
      .eq('contact_id', contactId);
    return data;
  },
  enabled: !!contactId,
});
```

### Dialog dodawania

Uzywa `Popover` zamiast pelnego dialogu -- lekki dropdown z:
1. Select zespolu (z `useDealTeams`)
2. Select kategorii (COLD / LEAD / TOP / HOT / CLIENT)
3. Przycisk "Dodaj" wywolujacy `useAddContactToTeam`

Po dodaniu -- invalidacja `['contact-deal-teams', contactId]` + istniejace invalidacje.

### Integracja w ContactDetail.tsx

Wstawienie pomiedzy linia 118 (koniec breadcrumbs) a linia 119 (ContactDetailHeader):

```text
<ContactDealsPanel contactId={contact.id} />
```

Renderowanie tylko dla nie-asystentow (analogicznie do reszty paneli).

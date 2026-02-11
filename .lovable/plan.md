
# Naprawa: klient pojawia sie dopiero po odswiezeniu strony

## Problem

Po dodaniu klienta przez `AddClientDialog`, lista klientow nie aktualizuje sie automatycznie. Powodem jest brak invalidacji query `['deal-team-clients', teamId]` w mutacji `useAddContactToTeam`.

Mutacja invaliduje tylko `['deal-team-contacts', teamId]` (query dla Kanban/Tabeli), ale zakladka KLIENCI uzywa osobnego query key `['deal-team-clients', teamId]` (z hooka `useTeamClients`).

## Rozwiazanie

Dodanie invalidacji `['deal-team-clients', result.teamId]` w `onSuccess` mutacji `useAddContactToTeam`.

## Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/hooks/useDealsTeamContacts.ts` | Linia 185 -- dodanie `queryClient.invalidateQueries({ queryKey: ['deal-team-clients', result.teamId] })` w `onSuccess` |

## Szczegoly techniczne

W funkcji `useAddContactToTeam`, blok `onSuccess` (linia 184-187):

Przed:
```text
onSuccess: (result) => {
  queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
  toast.success('Kontakt został dodany do zespołu');
},
```

Po:
```text
onSuccess: (result) => {
  queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
  queryClient.invalidateQueries({ queryKey: ['deal-team-clients', result.teamId] });
  toast.success('Kontakt został dodany do zespołu');
},
```

Jedna linia, natychmiastowy efekt -- lista klientow odswieza sie od razu po dodaniu.

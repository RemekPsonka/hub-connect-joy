
# Naprawa listy członków zespołu

## Problem
W modalu tworzenia zespołu deals brakuje Remka (ownera) na liście dostępnych członków. Filtr na linii 115 celowo wyklucza użytkowników z rolą `owner`:

```typescript
const directors = users.filter(u => !u.roles.includes('owner') || users.length === 1);
```

## Rozwiązanie
Usunięcie tego filtra - wszyscy użytkownicy w tenant powinni być dostępni do wyboru jako członkowie zespołu, w tym owner i admini.

## Plik do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/owner/DealTeamModal.tsx` | Usunięcie filtra wykluczającego ownera |

## Szczegóły zmiany

**Przed (linia 114-115):**
```typescript
// Get directors (users who have a director record)
const directors = users.filter(u => !u.roles.includes('owner') || users.length === 1);
```

**Po:**
```typescript
// Get all users who can be team members (all directors in tenant)
const directors = users;
```

## Efekt
Po zmianie na liście członków zespołu pojawią się wszyscy użytkownicy w organizacji, w tym Remek (owner/admin).

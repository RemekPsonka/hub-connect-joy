
# Uproszczenie widoku Kanban (Lejek)

## Cel
Usuniecie kart statystyk (TeamStats), pipeline wazonego i lejka konwersji z widoku Kanban -- te dane sa juz dostepne na zakladce Dashboard. Widok Kanban powinien pokazywac tylko sam lejek (kolumny Kanban z kontaktami).

## Zmiana

### `src/pages/DealsTeamDashboard.tsx`

Dodanie `viewMode !== 'kanban'` do warunku wyswietlania `TeamStats` (linia 206):

```
{selectedTeamId && viewMode !== 'dashboard' && viewMode !== 'tasks' && viewMode !== 'kanban' && <TeamStats teamId={selectedTeamId} />}
```

To ukryje karty statystyk, pipeline wazony i lejek konwersji w widoku Kanban, pozostawiajac sam board z kolumnami.

## Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/pages/DealsTeamDashboard.tsx` | Dodanie wykluczenia `kanban` z warunku TeamStats |

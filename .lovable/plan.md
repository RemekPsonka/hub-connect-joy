
# Uproszczenie widoku "Zadania sprzedazy" + bloker osoby

## Zmiany

### 1. Ukrycie TeamStats w widoku Zadania

W `DealsTeamDashboard.tsx` zmiana warunku wyswietlania TeamStats -- wykluczenie rowniez widoku `tasks`:

```
viewMode !== 'dashboard' && viewMode !== 'tasks'
```

### 2. Dodanie "blokera" osoby w MyTeamTasksView

Zamiana obecnego dropdowna filtra na widoczny pasek z avatarami/przyciskami czlonkow zespolu. Klikniecie w osobe "blokuje" widok na jej zadania. Aktywna osoba jest podswietlona. Przycisk "Wszyscy" resetuje filtr.

Wizualnie: pasek z przyciskami na gorze widoku zadań:

```
[Wszyscy] [Ja] [Adam K.] [Maria S.] [Tomek W.]
```

Aktywny przycisk jest podswietlony (variant="default"), reszta outline.

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/pages/DealsTeamDashboard.tsx` | Dodanie `viewMode !== 'tasks'` do warunku TeamStats (linia 206) |
| `src/components/deals-team/MyTeamTasksView.tsx` | Zamiana Select filtra na pasek przyciskow z czlonkami zespolu jako "bloker" |

### MyTeamTasksView -- szczegoly blokera

- Usuniecie obecnego Select z filtrem czlonkow (linie 111-127)
- Dodanie paska przyciskow: kazdy czlonek zespolu jako Button z imieniem
- Przycisk "Wszyscy" i "Moje" na poczatku
- Aktywny przycisk: `variant="default"`, reszta: `variant="outline"`
- Zachowanie istniejacego stanu `filterMember` i logiki filtrowania
- Przeniesienie "Zakonaczone" i badge overdue pod pasek blokera

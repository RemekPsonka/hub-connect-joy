## Status: oba fixy są już w kodzie — proponowana zmiana = 1 mikropoprawka spójności

### Recon (kroki 0.1–0.4)

1. **TasksHeader.tsx** → `src/components/sgu/headers/TasksHeader.tsx`
2. **MyTeamTasksView.tsx** → `src/components/deals-team/MyTeamTasksView.tsx`
3. W `MyTeamTasksView.tsx`:
   - **NIE MA** już `useState` dla `filterMember` / `filterStatus` / `filterPriority` — są czytane z URL (linie 56–58).
   - `useSearchParams` zaimportowane (linia 3), `setSearchParams` w destrukturyzacji (linia 48).
   - Helper `setUrlParam` istnieje (linie 60–68), settery `setFilterMember/Status/Priority` (linie 70–72).
   - Param `bucket` czytany jako `urlBucket` (linia 49).
4. W `TasksHeader.tsx` linia 37–39 — `doneToday` już liczy:
   ```ts
   mine.filter(a => a.status === 'completed' && !!a.completed_at && a.completed_at >= todayStart).length
   ```
   Bez fallbacku na `created_at`.

### Wnioski z weryfikacji

- `grep "useState.*filter(Member|Status|Priority)"` w MyTeamTasksView.tsx → **0 hits** ✓
- `grep "completed_at ?? a.created_at"` w TasksHeader.tsx → **0 hits** ✓
- Sprint **B-FIX (1) + (2) został już wdrożony** w poprzednich iteracjach.

### Jedyna pozostała niespójność (mikro)

W `MyTeamTasksView.tsx` linia 116, branch `urlBucket === 'done_today'`, używa luźniejszego porównania:
```ts
(a) => a.status === 'completed' && (a.completed_at ?? '') >= startIso
```
Pusty string `''` jako fallback jest `< startIso` więc zachowanie jest poprawne, ale styl rozjeżdża się z TasksHeader. Dla spójności zaostrzymy do tego samego wzorca.

### Plan zmian (1 plik, 1 linia)

**`src/components/deals-team/MyTeamTasksView.tsx`** — linia 116:

```diff
-        (a) => a.status === 'completed' && (a.completed_at ?? '') >= startIso,
+        (a) => a.status === 'completed' && !!a.completed_at && a.completed_at >= startIso,
```

Zero nowych importów, zero zmian w hookach, zero zmian DB.

### Weryfikacja

- `npm run lint` + `npm run typecheck` — clean.
- Smoke: kliknięcie kafla "Zrobione dziś" w `/sgu/zadania` pokazuje wyłącznie zadania z faktycznym `completed_at >= today` (zero false positives).

### Commit

```
fix(sgu/dziennik): ujednolicenie filtra done_today w MyTeamTasksView

Sprint B-FIX (1)+(2) z briefu został już wdrożony wcześniej:
  - TasksHeader.tsx: doneToday liczy tylko completed && completed_at >= today
  - MyTeamTasksView.tsx: member/status/priority już w URL (setUrlParam)

Domknięta jedna niespójność: branch done_today w filtered useMemo używał
(completed_at ?? '') >= startIso. Zaostrzone do !!completed_at &&
completed_at >= startIso — ten sam wzorzec co w TasksHeader.

Dotknięte pliki: 1
```

### Czego NIE robię (i dlaczego)

- Nie dotykam `TasksHeader.tsx` — fix już tam jest.
- Nie refaktoryzuję filtrów do URL — już są.
- Nie ruszam `searchQuery` ani `viewMode` (zgodnie z briefem zostają w `useState`).

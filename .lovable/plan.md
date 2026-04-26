# Plan: FIX-DnD-BUG + rollback Mariana Durlaka

## Potwierdzony stan

- `Marian Durlak` ma obecnie w `deal_team_contacts`: `category='lead'`, `offering_stage='meeting_scheduled'`, brak `next_meeting_date`, brak milestone timestampów.
- Bug jest zgodny z opisem: po ustawieniu `category='lead'`, helper `deriveKanbanColumn` nadal może wyprowadzić kontakt do `lead`, jeśli istnieje marker `offering_stage='meeting_scheduled'`.

## Zakres zmian

### 1. Rollback danych Mariana Durlaka

Wykonam wskazany rollback danych:

```sql
UPDATE deal_team_contacts
SET category = 'prospect', updated_at = now()
WHERE contact_id = (
  SELECT id
  FROM contacts
  WHERE first_name = 'Marian'
    AND last_name = 'Durlak'
  LIMIT 1
)
AND category = 'lead';
```

Po update sprawdzę SELECT-em, że rekord wrócił do `category='prospect'`.

### 2. Helper `TRANSITION_PATCH`

W `src/lib/sgu/deriveKanbanColumn.ts` dodam export:

```ts
export const TRANSITION_PATCH: Record<KanbanColumn, Partial<Record<KanbanColumn, Partial<DealTeamContact>>>> = {
  prospect: { cold: { category: 'lead' } },
  cold: { lead: { offering_stage: 'meeting_scheduled' } },
  lead: { top: { offering_stage: 'meeting_done', k1_meeting_done_at: new Date().toISOString() } },
  top: { hot: { offering_stage: 'power_of_attorney', poa_signed_at: new Date().toISOString() } },
  hot: {},
};
```

### 3. Pre-update simulator w `handleDragEnd`

W `src/components/sgu/sales/UnifiedKanban.tsx`:

- zaimportuję `TRANSITION_PATCH`,
- po walidacji kierunku ruchu (`same`, `backward`, `skip>1`) dodam wspólną walidację symulacji dla dozwolonych ruchów o 1 kolumnę,
- przed `updateContact.mutate(...)` i przed każdym `setScheduleMeetingContact`, `setMeetingDecisionContact`, `setSignPoaContact` wykonam:

```ts
const patch = TRANSITION_PATCH[fromCol]?.[toCol] ?? {};
const simulated = { ...contact, ...patch };
const wouldBeCol = deriveKanbanColumn(simulated);

if (wouldBeCol !== toCol) {
  toast.error(
    'Stan kontaktu uniemożliwia tę zmianę. Sprawdź na karcie — kontakt może mieć już zaplanowane spotkanie lub inne markery.',
  );
  return;
}
```

Efekt: Prospekt→Cold dla kontaktu z istniejącym `offering_stage='meeting_scheduled'` zostanie zablokowany toastem i nie wykona żadnego zapisu do DB.

### 4. Dokumentacja sprintu i QA

- Zaktualizuję `.lovable/plan.md` krótkim wpisem o fixie S7-v2.
- Uruchomię `tsc`.
- Jeśli czas/środowisko pozwoli, uruchomię też lint zgodnie ze standardem projektu.

## Done when

- Marian Durlak ma `category='prospect'` po SELECT.
- `TRANSITION_PATCH` istnieje w `deriveKanbanColumn.ts`.
- `handleDragEnd` ma pre-update simulator przed wszystkimi 4 transition actions.
- `tsc` przechodzi clean.
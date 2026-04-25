# Naprawa zapisu notatek odprawy + AI czyta notatki

## Diagnoza (z logów + DB)

1. **Notatki nie zapisują się — RLS blokuje**: `deal_team_activity_log` ma TYLKO politykę SELECT (`dtal_select`), brak INSERT. Dialog „Notatka z odprawy" w `OperationalActions` cicho fail-uje (toast errora wisi w katch). Tabela jest pusta — żadna notatka nigdy się nie zapisała.

2. **Live-copilot rzuca PGRST201**: ambiguous FK między `deal_team_contacts` a `contacts` (są dwa: `deal_team_contacts_contact_id_fkey` i `_source_contact_id_fkey`). `safeSelect` połyka błąd warningiem, więc cały kontekst kontaktu (`dtc`, polisy, gcal) leci PUSTY → AI generuje śmieci.

3. **AI nie czyta notatek**: ani `live-copilot`, ani `agenda-builder` nigdy nie sięga do `deal_team_activity_log`. Notatki z odprawy są niewidoczne dla AI.

## Plan naprawy

### A. Migracja DB — RLS INSERT na `deal_team_activity_log`

```sql
CREATE POLICY "dtal_insert_team_member"
ON public.deal_team_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_deal_team_member(team_id)
  AND (actor_id IS NULL OR actor_id = auth.uid())
);
```

`team_id`, `tenant_id`, `team_contact_id`, `action` są NOT NULL — komponent już je wysyła.

### B. Live-copilot: napraw FK + dociągnij notatki

W `supabase/functions/live-copilot/index.ts`:

1. **Fix PGRST201**: w `select(...)` dla `deal_team_contacts` zmień
   `contact:contacts(...)` → `contact:contacts!deal_team_contacts_contact_id_fkey(...)`.

2. **Dorzuć notatki do `P0Context`**:
   ```ts
   safeSelect(
     supabase
       .from("deal_team_activity_log")
       .select("created_at, action, new_value, actor_id")
       .eq("team_contact_id", dealTeamContactId)
       .eq("action", "note_added")
       .gte("created_at", fourteenDaysAgo)
       .order("created_at", { ascending: false })
       .limit(20),
   )
   ```
   Mapuj na `recent_notes: [{date, text, actor_id}]` w P0Context i dodaj do JSON-a wysyłanego do LLM.

3. **System prompt** (sekcja Kontekst): dopisz „… ostatnie notatki z odprawy (recent_notes)".

### C. Agenda-builder: dorzuć ostatnią notatkę do kandydata

W `supabase/functions/agenda-builder/index.ts`:

1. W `gatherCandidates` dociągnij równolegle ostatnie wpisy `deal_team_activity_log` (`action='note_added'`) per `team_contact_id` → mapuj na pole `last_note: { date, text } | null`.
2. Dodaj `last_note` do interfejsu `ContactCandidate` i do JSON-a dla LLM.
3. Dopisz do system prompt: „Jeśli `last_note` istnieje, weź ją pod uwagę przy klasyfikacji do sekcji."

### D. Smoke

1. `/sgu/odprawa` → otwórz kontakt → „Notatka" → wpisz tekst → „Zapisz" → toast „Notatka zapisana", insert do `deal_team_activity_log` (status 201).
2. Otwórz live-copilot dla tego kontaktu → sekcja Kontekst zawiera notatkę.
3. Wygeneruj agendę → SQL: `SELECT new_value->>'note', created_at FROM deal_team_activity_log WHERE action='note_added' ORDER BY created_at DESC LIMIT 5;` powinno mieć wpisy.

## Pliki

- **Migracja**: `<ts>_dtal_insert_policy.sql` (1 policy)
- **EDIT**: `supabase/functions/live-copilot/index.ts` (FK alias + nowy safeSelect + prompt)
- **EDIT**: `supabase/functions/agenda-builder/index.ts` (last_note w kandydacie + prompt)

Brak zmian w UI — `OperationalActions.tsx` już wysyła poprawny insert; problemem była wyłącznie RLS.

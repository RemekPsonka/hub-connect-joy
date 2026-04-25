# AGENDA-SECTIONS-01 — pre-brief AI z sekcjami grupującymi

Refactor lewej kolumny `/sgu/odprawa` z płaskiej listy 25 kontaktów na **5 priorytetowych sekcji** generowanych przez AI, ze sticky headerami i sumką u góry.

## Co zobaczy użytkownik

Zamiast obecnej płaskiej listy:

```text
🔥 Pilne dziś (3)
  ▸ Adam Papiernik (Firma X)         ✨ Overdue task K3 od 12.04
  ▸ Jan Kowalski (Acme)              ✨ Audyt zaplanowany 22.04, brak akcji
  ▸ ...
⚠️ Stalled (5)
  ▸ ...
🎯 10x (4)
  ▸ ...
📞 Follow-upy (8)
  ▸ ...
🆕 Nowi prospekci (2)
  ▸ ...
```

Sumka na górze: `Dziś: 3 pilnych · 5 stalled · 4× 10x · 8 follow-upów · 2 nowych`.

Backward-compat: stare proposals (z samym `ranked_contacts`) renderują się jako jedna sekcja „Pozostałe".

---

## Plan techniczny

### A. Migracja DB

`supabase/migrations/<ts>_ai_agenda_grouped_sections.sql`:

```sql
ALTER TABLE public.ai_agenda_proposals
  ADD COLUMN IF NOT EXISTS grouped_sections jsonb;

COMMENT ON COLUMN public.ai_agenda_proposals.grouped_sections IS
  'Sekcje pre-briefu: [{key,label,icon,contacts:[{contact_id,reason}]}]. NULL = legacy proposal (użyj ranked_contacts).';
```

Brak DROP — `ranked_contacts` zostaje dla starych rekordów.

### B. Edge function `agenda-builder`

W `supabase/functions/agenda-builder/index.ts`:

1. **Nowy tool** `submit_grouped_agenda` (zastępuje `submit_ranking` jako `tool_choice`):

```ts
{
  name: "submit_grouped_agenda",
  parameters: {
    sections: [{
      key: "urgent" | "stalled" | "10x" | "followup" | "new_prospects",
      label: string,    // "Pilne dziś"
      icon: string,     // "🔥"
      contacts: [{ contact_id: uuid, reason: string }]  // max 80 zn.
    }]
  }
}
```

2. **System prompt PL** (zastępuje obecny):
   - 🔥 Pilne dziś — overdue tasks lub at-risk milestone (>7d bez akcji)
   - ⚠️ Stalled — >14 dni bez ruchu, ryzyko utraty
   - 🎯 10x — `temperature='10x'` lub `category='10x'`
   - 📞 Follow-upy — open task na dziś/jutro
   - 🆕 Nowi prospekci — utworzeni <7 dni temu, brak K1
   - Każdy kontakt MAX w 1 sekcji (priorytet: urgent > 10x > stalled > followup > new)
   - Pomiń puste sekcje, max ~25 kontaktów łącznie, format daty `DD.MM`, bez kwot PLN.

3. **Persist**: zapis do `grouped_sections` (jsonb). `ranked_contacts: []` dla nowego flow. Walidacja: każdy `contact_id` musi być w wejściowych kandydatach; deduplikacja (kontakt w wielu sekcjach → zostawiamy w pierwszej wg priorytetu).

4. Audit log: `tool_name='agenda-builder.submit_grouped_agenda'`, output zawiera `sections_count` + `total_contacts`.

5. Fallback: gdy `grouped_sections` puste a `ranked` niepusty (np. LLM zwrócił stary kształt) — zapisz oba.

### C. RPC `get_odprawa_agenda`

Dorzucone kolumny w RETURNS TABLE:
- `ai_section_key text`
- `ai_section_label text`
- `ai_section_icon text`

Logika:
- Nowy CTE `ai_sections` rozwija `grouped_sections` przez podwójny `jsonb_array_elements` (sekcje × contacts), wyciąga `key/label/icon/contact_id/reason`.
- Gdy `grouped_sections IS NOT NULL` → bierzemy z niego `ai_reason` (zamiast z `ranked_contacts`).
- Gdy NULL → legacy fallback do istniejącego `ai_ranking` z `ranked_contacts`, sekcja = NULL (UI → „Pozostałe").
- Sortowanie:
  ```
  ORDER BY
    CASE ai_section_key
      WHEN 'urgent' THEN 0
      WHEN '10x' THEN 1
      WHEN 'stalled' THEN 2
      WHEN 'followup' THEN 3
      WHEN 'new_prospects' THEN 4
      ELSE 5
    END,
    priority_rank,
    last_status_update DESC NULLS LAST
  ```

### D. UI `AgendaList.tsx`

W `src/components/sgu/odprawa/AgendaList.tsx`:

1. Rozszerzenie typu `OdprawaAgendaRow` (w `useOdprawaAgenda.ts`) o `ai_section_key | ai_section_label | ai_section_icon`.
2. `useMemo` grupuje wiersze po `ai_section_key` + zachowuje kolejność z RPC (Map zachowuje insertion order).
3. Render:
   - **Sumka u góry** (mała ramka `bg-muted/50 rounded p-2 text-xs`): liczby per sekcja.
   - **Per sekcja**: header `text-xs font-semibold sticky top-0 bg-background py-1` z `{icon} {label} ({count})`, pod nim aktualne `<button>` row-y (bez zmian wewnętrznego renderu).
4. Zachowane: `currentContactId`, `discussedContactIds`, `onSelect`, ai_reason badge.
5. Pusta sekcja AI (nie zwrócona przez LLM) → po prostu jej nie renderujemy.

### E. Walidacja

1. `npm run typecheck`
2. Smoke `/sgu/odprawa`:
   - Klik „Wygeneruj agendę AI" → toast 5–15s
   - Lewa lista pokazuje ≥2 sekcje z headerami + sumkę
   - Sticky header trzyma się na górze przy scrollu
   - Klik kontaktu nadal otwiera ContactTasksSheet
3. SQL check:
   ```sql
   SELECT generated_at, jsonb_array_length(grouped_sections)
   FROM ai_agenda_proposals
   WHERE team_id=? ORDER BY generated_at DESC LIMIT 1;
   ```

### Pliki

- **NEW**: `supabase/migrations/<ts>_ai_agenda_grouped_sections.sql`
- **NEW**: `supabase/migrations/<ts+1>_get_odprawa_agenda_sections.sql` (CREATE OR REPLACE FUNCTION)
- **EDIT**: `supabase/functions/agenda-builder/index.ts`
- **EDIT**: `src/hooks/useOdprawaAgenda.ts` (3 nowe pola w typie)
- **EDIT**: `src/components/sgu/odprawa/AgendaList.tsx` (grupowanie + sumka + sticky)

### Backward-compat

- Stare `ai_agenda_proposals.grouped_sections IS NULL` → RPC zwraca `ai_section_key=NULL` → UI grupuje do `"_other"` z labelem „Pozostałe" i ikoną `·`.
- `ranked_contacts` nadal czytane jako fallback źródła `ai_reason`.
- Brak breaking change dla `useDealTeamContactByContactId` ani innych konsumentów RPC.

# ODPRAWA-03 Faza D1 — live-copilot read-only sidepanel

3-kolumnowy layout `/sgu/odprawa` z prawą kolumną AI Copilot, która streamuje
**Kontekst / Sugerowaną akcję / Pytania wspierające** dla aktualnie wybranego kontaktu.
**D1 = read-only** — żadnego pisania do bazy, żadnego tool callingu write, brak AlertDialog.

## A. Edge function `supabase/functions/live-copilot/index.ts`

**Auth:** `verifyAuth` + sprawdzenie membership (`deal_team_members` po `team_id` z sesji,
analogicznie jak w `agenda-builder` Path B).

**Input (POST JSON):** `{ sessionId: string, contactId: string, dealTeamContactId: string }`

**Krok 1 — P0 context (8 SELECT-ów równolegle przez `Promise.all`):**
1. `deal_team_contacts` (full row po `dealTeamContactId`)
2. `meeting_decisions` ostatnie 14 dni dla `contact_id`
3. `tasks` open + overdue (status NOT IN completed/cancelled) dla `dealTeamContactId`
4. `unified_meetings` next 7 dni dla `contact_id`
5. `insurance_policies` + `policy_renewals` (jeśli kontakt-klient — fallback empty array)
6. Poprzednia sesja odprawy: `odprawa_sessions` (last finished, ten sam team) +
   `meeting_decisions` z tej sesji dla tego contact_id
7. Ownership map: jeśli `ownership` table exists — best-effort, fallback empty
8. GCal directora today: `gcal_events` start_at = today (best-effort, fallback empty)

Wszystko cast'owane defensywnie (`as any` per result, jak w `agenda-builder`).
Każdy błąd pojedynczego SELECT-a → log + pusty array, **nie crash**.

**Krok 2 — Audit:**
```ts
INSERT ai_audit_log {
  event_type: 'tool_call_read',
  tool_name: 'gather_p0_context',
  input: { sessionId, contactId, dealTeamContactId },
  output: { counts: { decisions: N, tasks: N, ... } },
  team_id, tenant_id, user_id, odprawa_session_id: sessionId
}
```

**Krok 3 — LLM call (streaming SSE, `google/gemini-2.5-flash` przez `callLLM`):**

System prompt po polsku, jawne instrukcje R3:
> Format odpowiedzi — DOKŁADNIE 3 sekcje z nagłówkami markdown:
> `## Kontekst` (3-4 bullets z faktów z danych)
> `## Sugerowana akcja` (1 zdanie, BEZ kwot PLN, BEZ konkretnych dat poza tymi z danych)
> `## Pytania wspierające` (2 pytania pomocnicze do rozmowy)
>
> ZASADY:
> - Milestone date = WYŁĄCZNIE z kolumn `*_at` w deal_team_contacts. Nie interpretuj milestone'u z innych źródeł.
> - Nie wymyślaj rozmów/spotkań/dat. Operujesz tylko na danych z input JSON.
> - Kwoty PLN — TYLKO z policies/products w input.

User message: serializowany P0 context jako JSON.

**Krok 4 — Anti-halucynacja (post-stream walidatory na akumulowanym `fullText`):**
- **R1:** regex `/(dzwonił|spotkał się|rozmawiał|kontaktował)\s+(wczoraj|dzisiaj|w\s+(poniedziałek|wtorek|środę|czwartek|piątek)|\d{1,2}\.\d{1,2})/gi` — jeśli match i nie ma odpowiadającego rekordu w `meeting_decisions`/`unified_meetings`/`tasks` → loguj warning + dopisz do `output.r1_violations`. **W D1 nie strip-ujemy** (overhead na streamie), tylko logujemy. (Pełny strip = D1.1 jeśli okaże się problemem.)
- **R2:** regex kwot `/(\d[\d\s]*)\s*(zł|PLN)/gi` — buduj allowlist kwot z `insurance_policies.premium_amount_gr` + `deal_team_products`. Niedopasowane → log warning + `output.r2_violations`.
- **R3:** zaimplementowane w prompt (preventive).

**Krok 5 — Po zakończeniu streamu:**
```ts
INSERT ai_audit_log {
  event_type: 'llm_response',
  tool_name: 'live-copilot',
  output: { length: text.length, r1_violations, r2_violations },
  llm_model, llm_tokens_in, llm_tokens_out, llm_cost_cents,
  odprawa_session_id, team_id, tenant_id, user_id
}
```

**Streaming response:** zwraca `result.stream` bezpośrednio do klienta z nagłówkami
`Content-Type: text/event-stream`. Walidatory + audit `llm_response` wykonujemy w
`new ReadableStream` wrapperze, który tee-uje strumień (akumulujemy delta'y → po
`[DONE]` uruchamiamy walidację + insert audit).

**Errors:** 429/402 → JSON `{ error, retryable }` z odpowiednim status code.

## B. Hook `src/hooks/odprawa/useAILiveContext.ts`

```ts
useAILiveContext({ sessionId, contactId, dealTeamContactId, enabled })
  → { context: string, action: string, questions: string,
      isStreaming: boolean, error: Error | null }
```

- Custom fetch (nie `supabase.functions.invoke` — potrzebny strumień) na
  `${VITE_SUPABASE_URL}/functions/v1/live-copilot` z `Authorization: Bearer ${session.access_token}`.
- Parser SSE: akumuluje `delta.content` z chunków OpenAI-format SSE
  (zgodnie z formatem Lovable Gateway).
- Po każdym delta → re-parse `fullText` na 3 sekcje przez split na
  `## Kontekst`, `## Sugerowana akcja`, `## Pytania wspierające`.
  Stan aktualizuje się incrementally (pierwsza sekcja widoczna zanim druga się dopisze).
- `useEffect` resetuje stan i abortuje poprzedni stream przy zmianie `contactId`.
- Error → toast (429: "Limit zapytań — spróbuj za chwilę"; 402: "Wyczerpany kredyt AI").

## C. Komponent `src/components/sgu/odprawa/AICopilotSidepanel.tsx`

Props: `{ sessionId: string | null, contactId: string | null, dealTeamContactId: string | null }`

Zachowanie:
- Jeśli `!contactId` → pusty placeholder ("Wybierz kontakt aby zobaczyć podpowiedzi AI").
- 3 `<Card>` — Kontekst / Sugerowana akcja / Pytania wspierające.
- `<Skeleton>` (shadcn) podczas `isStreaming && !context`.
- Markdown render: prosty (już mamy `react-markdown`? jeśli nie — split linii i `<ul><li>` ręcznie, **nie dodajemy nowej biblioteki**. Sprawdzę i zdecyduję, default = ręczny renderer dla bullets/akapitów).
- D1: sugerowana akcja jako **TEKST** — żadnych przycisków write.
- Sticky w prawej kolumnie (`sticky top-4`).

## D. Layout `src/pages/sgu/SGUOdprawa.tsx`

Zmiana grid:
```
xl:grid-cols-[280px_minmax(0,1fr)_360px]
lg:grid-cols-[280px_1fr]   (sidepanel pod kartą jako 3. element w col-span-full)
grid-cols-1                (mobile)
```

Trzecia kolumna:
```tsx
<div className="xl:block lg:col-span-full xl:col-span-1">
  <AICopilotSidepanel
    sessionId={active?.id ?? null}
    contactId={selectedAgendaRow?.contact_id ?? null}
    dealTeamContactId={dtc?.id ?? null}
  />
</div>
```

Aktualny `max-w-7xl` → zostawiamy, bo 280+1fr+360 mieści się w xl. Jeżeli za ciasno przy
viewport 1274 — rozważyć `max-w-[1400px]` lub przesunięcie sidepanelu pod kartę poniżej
breakpointu xl (1280px). **Decyzja:** breakpoint dla 3-col = `2xl` zamiast `xl`, a dla
`xl` (1280-1535) sidepanel pod kartą kontaktu (wystarczająco czytelnie). Zmienię grid na:
```
2xl:grid-cols-[280px_minmax(0,1fr)_360px]
lg:grid-cols-[280px_1fr]
```

## E. Weryfikacja

1. `npm run lint` + typecheck clean.
2. Smoke manual:
   - `/sgu/odprawa` → Startuj odprawę → klik kontakt → prawa kolumna pokazuje
     skeleton, potem streamuje 3 sekcje w <5s.
   - SQL: `SELECT event_type, tool_name, timestamp FROM ai_audit_log
     WHERE odprawa_session_id = '<id>' ORDER BY timestamp DESC LIMIT 5;`
     **Expected:** ≥2 wpisy per kontakt (`tool_call_read` + `llm_response`).
   - Zmiana kontaktu → poprzedni stream abortowany, nowy odpala się od zera.
3. Edge function logs (`supabase--edge_function_logs`) — sprawdzić brak `r1_violations`/`r2_violations`
   w typowym przypadku.

## F. Commit

`feat(odprawa): ODPRAWA-03 Faza D1 — live-copilot sidepanel (read-only, no tool calling write)`

## Pliki

**Nowe:**
- `supabase/functions/live-copilot/index.ts`
- `src/hooks/odprawa/useAILiveContext.ts`
- `src/components/sgu/odprawa/AICopilotSidepanel.tsx`

**Edytowane:**
- `src/pages/sgu/SGUOdprawa.tsx` (grid + 3. kolumna)
- `.lovable/plan.md` (status D1 → done)

## Out of scope (D2 — następny krok)

- 4 write tools (create_task, update_contact_stage, update_contact_temperature, log_decision).
- AlertDialog confirm per write proposal.
- Audit `user_confirm` / `user_reject`.
- Tool calls jako SSE proposals z metadata.

## Otwarte pytania (przyjmuję defaulty, chyba że odrzucisz)

1. **R1/R2 violations w D1:** tylko log + zapis do `output`, bez stripowania tekstu.
   Decyzja: jeśli >5% odpowiedzi ma violations → D1.1 wprowadzi strip. **OK?**
2. **Ownership table:** sprawdzę istnienie w runtime; jeśli brak — fallback empty bez błędu. **OK?**
3. **Markdown render:** ręczny parser (split na `\n`, `- ` → li) bez nowej biblioteki —
   zgodnie z constraint "nie dodajemy bibliotek". **OK?**

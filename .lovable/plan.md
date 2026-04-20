
## Plan: RD-A2 hotfix #2 — TL;DR fix + martwe przyciski headera

### Recon — sprawdzę przed implementacją
1. `_shared/llm-provider.ts` — czy `model_hint` jest obsługiwane, jak wygląda `LLMResponse` (czy ma `status`, `provider`, `tokens_in/out`).
2. `App.tsx` — czy istnieje trasa `/contacts/:id/edit` (decyzja: navigate vs toast).
3. Grep `SovraChat|SovraDialog|AskSovra` — czy jest gotowy drawer Sovry.
4. `ContactHeaderTLDR.tsx` i `ActivityComposer.tsx` — obecna struktura propsów dla wire-up tabu.

### Zmiany

**1. `supabase/functions/sovra-contact-tldr/index.ts`**
- Zamiana `JSON.stringify(payload)` na opisowy `userPrompt` w PL (jak w prompcie).
- Dopisanie do `systemPrompt`: „KRYTYCZNE: Zwróć CZYSTY TEKST. Nie zwracaj JSON, nie używaj cudzysłowów, nie opakowuj odpowiedzi."
- `callLLM({ model_hint: 'google/gemini-2.5-flash', ... })` — tylko jeśli recon potwierdzi że provider obsługuje to pole. Jeśli nie ma `model_hint` w typie → użyję faktycznego pola (`model` lub `preferred_model`) zgodnie z provider.ts.
- Dodaję `console.log('[tldr] prompt', ...)` przed i `console.log('[tldr] llmResp', ...)` po wywołaniu.
- Zachowuję fallback `'Brak podsumowania AI'` i upsert.
- Deploy edge function po zmianie.

**2. `src/components/contact-v2/ContactHeaderTLDR.tsx`**
- Import `useNavigate` z react-router-dom, `toast` z sonner.
- Nowe propsy: `onSelectAction: (tab: 'note' | 'email' | 'meeting') => void`.
- Dropdown `...`:
  - usuwam „Udostępnij"
  - „Ustaw właściciela" → `toast.info('Zmiana właściciela — wkrótce')`
  - „Edytuj" → `toast.info('Edycja kontaktu — wkrótce')` (recon `App.tsx` zapewne pokaże brak trasy edit)
  - „Historia" → `toast.info('Historia zmian — wkrótce')`
- Dropdown „Nowa akcja":
  - „Notatka" → `onSelectAction('note')`
  - „Spotkanie" → `toast.info('Spotkania — wymaga aktualizacji schematu, kolejny sprint')`
  - „Zadanie" → `toast.info('Zadania — kolejny sprint')`
- „Zapytaj Sovrę": jeśli recon znajdzie SovraChat → otwórz; inaczej `toast.info` + TODO comment.

**3. `src/pages/ContactDetailV2.tsx`**
- Dodaję `const [composerTab, setComposerTab] = useState<'note' | 'email' | 'meeting'>('note')`.
- Dodaję `const composerRef = useRef<HTMLDivElement>(null)`.
- Przekazuję do `ContactHeaderTLDR` prop `onSelectAction={(tab) => { setComposerTab(tab); composerRef.current?.scrollIntoView({behavior:'smooth', block:'start'}); }}`.
- Owijam `ActivityTimeline` (która zawiera composer) w `<div ref={composerRef}>` lub przekazuję ref bezpośrednio do composer area. **Recon potrzebny** — zobaczę gdzie composer jest renderowany (`ActivityTimeline` czy osobno).
- Przekazuję `activeTab={composerTab} onTabChange={setComposerTab}` do composera.

**4. `src/components/contact-v2/ActivityComposer.tsx`**
- Nowe propsy `activeTab?: 'note' | 'email' | 'meeting'`, `onTabChange?: (tab: string) => void`.
- `<Tabs value={activeTab ?? 'note'} onValueChange={onTabChange}>` zamiast `defaultValue`.
- Reszta bez zmian (Email/Spotkanie nadal disabled).

### Po implementacji
- Deploy edge function `sovra-contact-tldr`.
- `tsc --noEmit` → 0 błędów.
- Test ręczny: F5 na karcie kontaktu, sprawdzenie logów edge w panelu.

### Pliki
- Edycja: `supabase/functions/sovra-contact-tldr/index.ts`, `src/components/contact-v2/ContactHeaderTLDR.tsx`, `src/components/contact-v2/ActivityComposer.tsx`, `src/pages/ContactDetailV2.tsx`.
- Bez DB, bez nowych komponentów, bez routingu.

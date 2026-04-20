
## Plan: RD-A2 hotfix #3 — podpięcia legacy + Sovra drawer

### Recon — kluczowe ustalenia

1. **`useContactConsultations`** używa tabeli `consultations` z polem **`scheduled_at`** (nie `scheduled_date` jak w prompcie). Render musi czytać `c.scheduled_at`.
2. **`useContactActivityLog`** zwraca `ContactActivityLog[]` z polami `activity_type`, `created_at`, `description` — OK, dopasowane.
3. **`ContactModal`** używa propsów **`isOpen` / `onClose`** (nie `open`/`onOpenChange`) i przyjmuje `contact: ContactWithGroup` — wymaga pełnego rekordu kontaktu, nie skleconego literalu. Najprościej: pobrać `ContactWithGroup` z React Query (jest już query w `ContactDetailV2`), rozszerzyć select o brakujące pola lub przekazać `contact as unknown as ContactWithGroup` z minimalną asercją (nieczyste). **Decyzja**: rozszerzę query w `ContactDetailV2` o pola wymagane przez `ContactModal` (first_name, last_name, title, tags, source, city, address, notes itp. — ale realnie modal sam je czyta przez `react-hook-form`, więc wystarczy mu rekord pasujący do `ContactWithGroup`). Bez modyfikacji query — przekażę pełen `contact` z ContactDetailV2 do header, header przekaże do modala. Wymaga to dociągnięcia `*` w select zamiast wyselectowanych pól. **Robię to**: zmienię select na `*, companies(id, name), contact_groups:primary_group_id(id, name, color)`.
4. **`AddOwnershipModal`** używa `open`/`onOpenChange` — OK, zgodne z promptem.
5. **`useSovraChat`**: zwraca `messages`, `isStreaming`, `sendMessage` (nie `onSend`), `confirmAction`, `lastError`, `clearError`, `retryLast`. SovraInput oczekuje `onSend: (text) => void` — wire jako `onSend={(t) => chat.sendMessage(t)}`. `SovraMessages` oczekuje `messages, isStreaming, onConfirm`.
6. **`SovraInput`** ma propsy `onSend, isStreaming, contextLabel?, onClearContext?` — bez problemu.
7. **Brak usecase dla "Spotkanie"** w "Nowa akcja" — usuwam item zgodnie z promptem.

### Pliki do edycji (4)

**1. `src/pages/ContactDetailV2.tsx`**
- Zmiana selectu z listy pól na `*, companies(id, name), contact_groups:primary_group_id(id, name, color), directors:director_id(id, full_name)` (żeby `ContactModal` dostał kompletny `ContactWithGroup`).
- Dodaję `const [historyOpen, setHistoryOpen] = useState(false)` + `historyRef = useRef<HTMLDivElement>(null)`.
- `handleRequestHistory` → setHistoryOpen + setTimeout scroll.
- Przekazuję do `ContactHeaderTLDR`: `onRequestHistory={handleRequestHistory}` + nowy prop `fullContact={contact}` (rekord do edycji).
- Przekazuję do `SectionsAccordion`: `forceOpenHistory={historyOpen}` + `historyRef={historyRef}`.

**2. `src/components/contact-v2/ContactHeaderTLDR.tsx`**
- Importy: `ContactModal`, `AddOwnershipModal`, `Sheet*` z `@/components/ui/sheet`, `useSovraChat`, `SovraMessages`, `SovraInput`, `SovraFallbackBanner`, `ExternalLink`.
- Nowe stany: `editOpen`, `ownershipOpen`, `sovraDrawerOpen`.
- Props: dodaję `onRequestHistory?: () => void` + `fullContact?: ContactWithGroup` (do przekazania do ContactModal).
- Dropdown "Nowa akcja" — usuwam item "📅 Spotkanie" w całości.
- "Zapytaj Sovrę" `onClick` → `setSovraDrawerOpen(true)` (zostawiam `useNavigate` — używany w SovraContactDrawer dla "Otwórz w pełnej Sovrze").
- Dropdown "...": Edytuj → setEditOpen, Ustaw właściciela → setOwnershipOpen, Historia → onRequestHistory().
- Renderuję na końcu (obok `PushToSGUDialog`):
  - `ContactModal isOpen={editOpen} onClose={() => setEditOpen(false)} contact={fullContact ?? null}`
  - `AddOwnershipModal open={ownershipOpen} onOpenChange={setOwnershipOpen} contactId={contactId} contactName={contact.full_name}`
  - `<SovraContactDrawer open={sovraDrawerOpen} onOpenChange={setSovraDrawerOpen} contactId={contactId} contactName={contact.full_name} companyName={contact.companies?.name ?? null} />`
- Dodaję wewnętrzny komponent `SovraContactDrawer` na końcu pliku z `Sheet` (side="right", w-full sm:max-w-xl), używa `useSovraChat({ contextType: 'contact', contextId })`, renderuje `SovraFallbackBanner` (warunkowo), `SovraMessages messages={chat.messages} isStreaming={chat.isStreaming} onConfirm={chat.confirmAction}`, `SovraInput onSend={(t) => chat.sendMessage(t)} isStreaming={chat.isStreaming}`, plus link "Otwórz w pełnej Sovrze →" → `navigate('/sovra?context=contact&id=...')`.

**3. `src/components/contact-v2/SectionsAccordion.tsx`**
- Props: dodaję `forceOpenHistory?: boolean`, `historyRef?: React.RefObject<HTMLDivElement>`.
- `useEffect` na zmianę `forceOpenHistory` — dodaje `'history'` do open jeśli nie ma.
- Owijam ostatni `<Item id="history">` w `<div ref={historyRef}>`.
- `Item` "history" → `<SectionHistory contactId={contactId} />` (przekazuję contactId).

**4. `src/components/contact-v2/sections/SectionHistory.tsx`**
- Przepisuję wg szablonu z promptu, ale:
  - `c.scheduled_at` zamiast `c.scheduled_date` (recon #1).
  - Używam `SectionShell` z istniejącym kontraktem (loading/error/empty).
  - Sortowanie po `scheduled_at` dla konsultacji, `created_at` dla activity.
  - Empty state: "Brak historii — żadnych konsultacji ani zdarzeń w audycie".
  - Loading/error przez `SectionShell` (dwa źródła — łączny stan: `isLoading = lc || la`, `isError = ec || ea`).

### Co NIE jest ruszane
- DB / migracje / edge functions
- `ActivityComposer`, `ActivityTimeline`, pozostałe sekcje (Company/Insurance/Emails/Meetings/Notes/AI)
- Routing / FeatureFlagGate
- V1 `ContactDetail`

### Acceptance
- "..." → Edytuj otwiera `ContactModal` z preloadowanym kontaktem.
- "..." → Ustaw właściciela otwiera `AddOwnershipModal`.
- "..." → Historia otwiera sekcję accordion + scroll do niej, sekcja pokazuje konsultacje + audit log.
- "Zapytaj Sovrę" otwiera prawy `Sheet` z czatem w kontekście kontaktu, z linkiem do pełnej Sovry.
- "Nowa akcja" — bez "📅 Spotkanie".
- `tsc --noEmit` → 0 błędów.

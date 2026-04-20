

## Status: KROK 6 prawie cały zrobiony w IA-2 + drobne uzupełnienia

Po analizie kontekstu — Krok 6 jest w ~85% zrealizowany w poprzednich iteracjach. Lista co JEST vs. BRAKUJE.

### Co JEST (potwierdzone w kontekście)
- ✅ `SGUClients.tsx` przepisany — renderuje `<SGUClientsView/>` (z 6 tabami: portfolio/payments/obszary/polecenia/odnowienia/prowizje)
- ✅ `ClientsHeader` 7 kart nad tabsami
- ✅ Tab `portfolio` → `ClientPortfolioTab` z 6 mini-ikonami kompleksowości + StageBadge interaktywny (status klienta)
- ✅ Tab `obszary` → `ClientObszaryTab` (lista klientów + `ClientComplexityPanel` z 6 rzędami i przyciskami "Utwórz task cross-sell")
- ✅ Tab `polecenia` → `ClientReferralsTab` z `AddReferralDialog` (`useAddClientReferral`) + lista per referrer
- ✅ Tab `odnowienia` → `ClientRenewalsTab`
- ✅ Tab `prowizje` → `ClientCommissionsTab`
- ✅ `useClientReferrals.ts` — query + add + convert (trigger DB auto-ambasador już istnieje)
- ✅ `useClientComplexity.ts` (logika 6 obszarów)
- ✅ Tab payments z Timeline 24mc

### Czego BRAKUJE wg tego prompta
1. **URL `?tab=...` sync** w `SGUClientsView` — obecnie używa `localStorage` (`TAB_KEY`), prompt wymaga `useSearchParams`. To jedyna realna nowa funkcjonalność.
2. **Klik wiersza w `portfolio` → przeskok do `obszary` z `selectedClientId`** — sprawdzić czy istnieje. W obecnym `ClientPortfolioTab` (z viewu w kontekście) nie widać tej logiki cross-tab. Dodać `onSelectClient` prop lub global state (Zustand zbyt ciężkie — lepiej lift state do `SGUClientsView` + URL `?tab=obszary&clientId=...`).
3. **`onCardClick` na `ClientsHeader`** — czy karty w headerze przełączają taby? Wg prompta: `<ClientsHeader onCardClick={setTab}/>`. Sprawdzić obecny interfejs i mapping (Aktywni→portfolio, Ambasadorzy→portfolio z filtrem?, Odnowienia 30d→odnowienia, Kompleksowi→obszary).
4. **`useCrossSellCandidates.ts`** — opcjonalny hook do alertów (3/6 lub 5/6 zielonych). Prompt go wymienia ale w DoD nie ma. Potraktować jako nice-to-have (skip → IA-3 jeśli nie używany nigdzie w UI Kroku 6).
5. **Order tabów wg prompta:** portfolio / obszary / polecenia / odnowienia / prowizje (5). Obecny widok ma 6: + `payments`. Decyzja: zostawiamy `payments` (decyzja IA-2 z tab refactoringu, pojemność informacyjna), ale weryfikujemy że order matchuje prompt (portfolio jest pierwszy, prowizje ostatnie).

### Plan implementacji

**A. `SGUClientsView.tsx` — URL sync + selectedClientId**
- Zamienić `localStorage` na `useSearchParams` z React Router.
- `tab` z `searchParams.get('tab')` (default `'portfolio'`).
- Dodać `selectedClientId` z `searchParams.get('clientId')`.
- Setter: `setSearchParams({ tab, ...(clientId ? {clientId} : {}) })`.
- Przekazać `selectedClientId` do `ClientObszaryTab` jako prop.
- Przekazać `onSelectClient(id)` do `ClientPortfolioTab` (które ustawia `tab=obszary&clientId=...`).
- Przekazać `onCardClick` do `ClientsHeader` z mappingiem 7 kart → docelowe taby.

**B. `ClientPortfolioTab.tsx` — klik wiersza**
- Dodać prop `onSelectClient?: (id: string) => void`.
- Na `<TableRow onClick={() => onSelectClient?.(r.id)}>` + `cursor-pointer hover:bg-muted/50`.
- Zachować istniejące akcje (StageBadge nie powinien triggerować onClick — `e.stopPropagation()`).

**C. `ClientObszaryTab.tsx` — preselect z URL**
- Dodać prop `selectedClientId?: string | null`.
- W `useEffect` po załadowaniu listy, jeśli `selectedClientId` istnieje i jest na liście → ustawić jako wybranego.
- Scroll do panelu (opcjonalnie, jeśli jest layout split).

**D. `ClientsHeader.tsx` — onCardClick**
- Sprawdzić czy istnieje `onCardClick` prop. Jeśli nie → dodać.
- Mapping (per prompt + nasze 7 kart):
  - Aktywni → `tab=portfolio`
  - Portfel → `tab=portfolio`
  - Ambasadorzy → `tab=portfolio` (filter ambasador — opcjonalnie URL param `?status=ambassador`, lub na razie tylko tab switch)
  - Kompleksowi → `tab=obszary`
  - Odnowienia 30d → `tab=odnowienia`
  - 2 pozostałe (Cross-sell? Polecenia?) → odpowiedni tab

**E. Skip świadomy**
- `useCrossSellCandidates.ts` — odłożyć do IA-3 (nie używany w żadnym DoD requirement).
- 6-vs-5 tabów — zostawić 6 (decyzja IA-2 z payments).

### Pliki do edycji (4)
- `src/components/sgu/SGUClientsView.tsx` — URL sync + state + propagacja
- `src/components/sgu/clients/ClientPortfolioTab.tsx` — onSelectClient prop + onClick row
- `src/components/sgu/clients/ClientObszaryTab.tsx` — selectedClientId prop + preselect
- `src/components/sgu/headers/ClientsHeader.tsx` — onCardClick prop + cursor-pointer (jeśli nie istnieje)

### Raport końcowy
- Lista zmodyfikowanych plików.
- Status DoD (6 punktów).
- Skip-y zaznaczone (`useCrossSellCandidates`, 5-vs-6 tabów).


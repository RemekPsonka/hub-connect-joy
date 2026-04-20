

## BLOK IA-3-FIX-1 — wynik recon + minimalny patch

### PRE-RECON (twarde dane)

**Stan vs. brief:**
| Element briefu | Stan | Akcja |
|---|---|---|
| `SGUClientsView` istnieje | ✅ `src/components/sgu/SGUClientsView.tsx` | — |
| 6 tabów (portfel/raty/obszary/polecenia/odnowienia/prowizje) | ✅ wszystkie 6 | — |
| `ClientPaymentsTab` z Timeline 24mc | ✅ 8998 B, IA-2 | — |
| `SGUClients.tsx` placeholder | ❌ już podpięty `<SGUClientsView/>` (BLOK 1 zrobione) | — |
| `ClientsHeader` + `onCardClick` | ✅ działa, mapping na taby | ⚠️ brak filtrów |
| Tab "obszary" = ComplexityPanel U GÓRY + ObszaryTab pod | ❌ **inny model**: `ClientObszaryTab` ma listę klientów + `ClientComplexityPanel` per-klient inside | **decyzja UX** |
| URL state `?tab=`, `?clientId=` | ✅ działa | ⚠️ brak `?filter=` |
| `ClientCrossSellTab` istnieje | ✅ plik jest, ale nie podpięty (zgodnie z briefem — pomijamy) | — |

**Wniosek**: ŚCIEŻKA A z dwoma drobnymi adaptacjami.

### Plan zmian (minimalny, surgical)

**EDIT 1**: `src/components/sgu/SGUClientsView.tsx` — rozszerz `onHeaderCardClick` o filtry per spec:

```ts
type Filter = 'lt14' | 'overdue30' | 'ambassadors' | null;

const onHeaderCardClick = (key: string) => {
  const map: Record<string, { tab: Tab; filter: Filter }> = {
    active:      { tab: 'portfolio',    filter: null },
    portfolio:   { tab: 'portfolio',    filter: null },
    ambassadors: { tab: 'portfolio',    filter: 'ambassadors' },
    complex:     { tab: 'obszary',      filter: null },
    renewals:    { tab: 'renewals',     filter: 'lt14' },
    overdue:     { tab: 'payments',     filter: 'overdue30' },
    commission:  { tab: 'commissions',  filter: null },
  };
  const m = map[key];
  if (!m) return;
  const params = new URLSearchParams(searchParams);
  params.set('tab', m.tab);
  params.delete('clientId');
  if (m.filter) params.set('filter', m.filter);
  else params.delete('filter');
  setSearchParams(params, { replace: true });
};
```

Plus przekaż `filter` z URL do tabów które go honorują:
```tsx
const filter = searchParams.get('filter');
// ...
<ClientPortfolioTab rows={rows} ... filter={filter} />
<ClientPaymentsTab rows={rows} ... filter={filter} />
<ClientRenewalsTab rows={rows} ... filter={filter} />
```

**EDIT 2** (warunkowy — sprawdzę najpierw czy taby już akceptują `filter` prop, jeśli nie → dodam optional prop + no-op do stuba TODO; full filter logic = osobny sprint, nie blokuje DoD):
- `src/components/sgu/clients/ClientPortfolioTab.tsx` — dodaj `filter?: string` (optional, na razie tylko `'ambassadors'` faktycznie filtruje przez `r.is_ambassador`)
- `src/components/sgu/clients/ClientPaymentsTab.tsx` — dodaj `filter?: string` (`'overdue30'` → już domyślnie pokazuje overdue, więc no-op marker)
- `src/components/sgu/clients/ClientRenewalsTab.tsx` — dodaj `filter?: string` (`'lt14'` → filter renewal_at <= today+14d)

**Tab "obszary" — DECYZJA UX (pytanie do ciebie)**:
- **Wariant A** (zgodne z briefem dosłownie): Wstawić ogólny `ClientComplexityPanel` U GÓRY (agregat dla zespołu — średnia liczba aktywnych obszarów, top kliencie kompleksowi) + `ClientObszaryTab` (per-client lista) pod spodem.
- **Wariant B** (zachowaj obecne — IA-2 design): zostaw `ClientObszaryTab` z listą klientów po lewej + ComplexityPanel per-wybrany-klient po prawej. Brief pomyłkowo opisuje strukturę z czasów gdy ComplexityPanel był globalny.

Rekomendacja: **B** (obecny stan jest UX-spójny, brief opisuje legacy). Jeśli **A** — trzeba dorobić agregat tygodniowy w `ClientComplexityPanel` (~30 min).

### Pliki

| Plik | Zakres |
|---|---|
| `src/components/sgu/SGUClientsView.tsx` | Rozszerzony `onHeaderCardClick` o filter mapping + przekazanie `filter` do 3 tabów |
| `src/components/sgu/clients/ClientPortfolioTab.tsx` | +`filter?: string`, obsługa `'ambassadors'` |
| `src/components/sgu/clients/ClientPaymentsTab.tsx` | +`filter?: string` (no-op marker dla `'overdue30'`) |
| `src/components/sgu/clients/ClientRenewalsTab.tsx` | +`filter?: string`, obsługa `'lt14'` |

### Świadome odstępstwa

1. **Tab "obszary" zostawiamy w obecnej formie (Wariant B)** — chyba że potwierdzisz Wariant A.
2. **Filter logic uproszczone**: `ambassadors` + `lt14` = realnie filtruje. `overdue30` = no-op (tab już domyślnie pokazuje overdue).
3. **`ClientCrossSellTab` pominięty** zgodnie z briefem (IA-4).

### Pytanie blokujące

**Wariant A czy B dla taba "obszary"?** Bez decyzji robię **B** (status quo), bo briefa interpretuję jako legacy opis.

### DoD lokalny po patchu

- ✅ 6 tabów (już jest)
- ✅ Tab "raty" Timeline 24mc (już jest)
- ✅ Klik karty header → tab + filter w URL (po patchu)
- ⚠️ Tab "obszary": Wariant B (chyba że wybierzesz A)
- ✅ `npm run typecheck` — bez nowych typów, tylko optional props


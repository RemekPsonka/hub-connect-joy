

## Sprint 17 — Sieć kontaktów 2.0 (zaadaptowany)

### Stan obecny
- Tabela `connections` (contact_a_id/contact_b_id, strength, connection_type, tenant_id) — istnieje, używana.
- `find_mutual_connections` RPC istnieje.
- `/network` (Network.tsx) + komponenty: `ConnectionGraph.tsx`, `AddConnectionModal`, `FindPathModal`, `GraphSidebar`, `ConnectionLegend`. Brak Three.js — graf już 2D (prawdopodobnie sigma/graphology z stacku). MD przewiduje usuwanie 3D, ale **u nas nic do usuwania**.
- Hook `useConnections` używany w `AddConnectionModal`.

### Korekty względem MD
1. **NIE archiwizuję+rebuild `connections`** — schemat i tak praktycznie się zgadza (kierunkowe `from/to` vs `a/b`). Zamiast: **rozszerzam istniejącą `connections`** o `relationship_type text`, `metadata jsonb`, `created_at timestamptz`. Snapshot do `archive.connections_backup_20260419` (read-only kopia, zgodnie z policy).
2. **Bez nowej tabeli `contact_connections`** — to byłaby duplikacja (zasada „jedna implementacja per domena"). Zostaje `connections`, RPC pracują na niej.
3. **2D graf już mamy** — `ConnectionGraph.tsx`. Sprawdzę co używa; jeśli `react-force-graph-2d` lub sigma — zostaje. Nie instaluję `react-force-graph-2d` jeśli sigma działa.
4. **RPC do dodania:**
   - `rpc_contact_neighbors(p_contact_id uuid, p_min_strength int)` — zwraca sąsiadów z obu kierunków (a↔b).
   - `rpc_network_paths(p_from uuid, p_to uuid, p_max_hops int default 3)` — BFS po `connections` (undirected, oba kierunki w CTE).
5. **Akcja „Poproś o intro"** — przycisk w panelu prawym `/network` (po wybraniu pośrednika): otwiera istniejący `ComposeEmailModal` (S15) z `initialTo=intermediate.email`, `initialSubject="Prośba o przedstawienie"`, `initialBody=` polski draft template (statyczny — bez dodatkowego callu do Sovry w MVP; user może dalej edytować lub poprosić Sovrę o przepisanie).
6. **`tenant_id`-based RPC** zamiast `director_id` — `connections.tenant_id` istnieje, RLS już per tenant.
7. **Warsztat z Remkiem** — pomijam jako gating (per project rules: „komendy bez pytań, Remek akceptuje domyślnie"). Default zakres = ten plan.

### A. Migracja `<ts>_sprint17_network_v2.sql`
- `CREATE SCHEMA IF NOT EXISTS archive;`
- `CREATE TABLE archive.connections_backup_20260419 AS SELECT * FROM public.connections;`
- `ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS relationship_type text, ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();`
- 2 indeksy: `(contact_a_id, strength DESC)`, `(contact_b_id, strength DESC)`.
- `CREATE OR REPLACE FUNCTION public.rpc_contact_neighbors(...)` — UNION obu kierunków + LEFT JOIN do `contacts` (full_name, contact_type), filtr `tenant_id = get_current_tenant_id()`. SECURITY INVOKER, `STABLE`, `SET search_path = public`.
- `CREATE OR REPLACE FUNCTION public.rpc_network_paths(...)` — recursive CTE; uwaga: undirected, więc w kroku rekurencyjnym joinujemy po `(a=last OR b=last)` i wybieramy „other end". Limit 10 ścieżek, sort po `total_strength DESC`. `SECURITY INVOKER`, `SET search_path = public`.
- Komentarz `-- ROLLBACK:` z DROP funkcji + DROP nowych kolumn (deprecated rename pattern niepotrzebny — kolumny dodawane, nie usuwane).

### B. Frontend
- **`src/hooks/useNetworkGraph.ts`** (nowy):
  - `useContactNeighbors(contactId, minStrength)` → `supabase.rpc('rpc_contact_neighbors', ...)`.
  - `useNetworkPath(fromId, toId, maxHops)` → `rpc_network_paths`, enabled tylko gdy oba ID są ustawione.
- **`src/pages/Network.tsx`**: sprawdzę istniejącą strukturę; dodam:
  - Tryb „Eksploracja od kontaktu" (rootContactId picker w sidebar) — używa `useContactNeighbors` zamiast pełnego ładowania.
  - Modal/panel „Ścieżka A→B" — input 2 kontaktów + lista ścieżek (sekwencja imion + cumulative strength) z `useNetworkPath`.
  - Przycisk „Poproś o intro" przy każdym węźle pośrednim ścieżki → otwiera `ComposeEmailModal` z prefillem.
- **`src/components/network/RequestIntroButton.tsx`** (nowy, mały):
  - Props: `intermediate: {id, full_name, email}`, `target: {full_name, company?}`.
  - Renderuje przycisk Mail + na klik: builduje template body PL (`"Cześć {imię}, czy mógłbyś przedstawić mnie {target}? ..."`), otwiera `ComposeEmailModal` z `initialTo=intermediate.email`, `initialSubject`, `initialBody`, `contactId=intermediate.id`. Disabled jeśli brak `intermediate.email`.

### C. Sovra (opcjonalnie, jeśli czas)
- Nowy tool `find_intro_path(from_contact_id, target_name)` — read-only:
  - Resolve target przez fuzzy match na `contacts.full_name` (per tenant).
  - Wywołaj `rpc_network_paths`.
  - Zwróć top 3 ścieżki z imionami.
- Update `human_summary`: „Znalazłem ścieżkę: Ty → Jan → Anna (siła 45)".
- Dodaję jako ostatni krok jeśli budżet pozwala; jeśli nie — pomijam, akcja „intro" działa ręcznie z `/network`.

### D. Memory
- Update `mem://features/network-graph` (nowy plik) — opisuje `connections` + RPC + akcja intro + S15 reuse.
- Update `mem://index.md` — dopis w sekcji Memories.

### E. Kolejność
1. Migracja SQL (alter + 2 RPC + archive snapshot).
2. `useNetworkGraph.ts` hook.
3. `RequestIntroButton.tsx`.
4. Modyfikacja `Network.tsx` (path explorer panel + intro buttons).
5. Sovra `find_intro_path` (jeśli czas).
6. Memory update.

### F. DoD
- [ ] `connections` ma `relationship_type`, `metadata`, `created_at`.
- [ ] Snapshot `archive.connections_backup_20260419`.
- [ ] `rpc_contact_neighbors`, `rpc_network_paths` działają z RLS.
- [ ] `/network`: panel ścieżki A→B → lista ścieżek.
- [ ] Klik „Poproś o intro" → `ComposeEmailModal` z prefillem.
- [ ] (Stretch) Sovra `find_intro_path`.

### G. Ryzyka
- **R1** Recursive CTE undirected — duże grafy (tysiące krawędzi) mogą spowolnić. Mitygacja: hard cap `max_hops=3`, `LIMIT 10` na finalnym SELECT, indeksy na obu FK.
- **R2** Istniejący `Network.tsx` może mieć inną architekturę grafu niż zakłada plan — przed edycją zweryfikuję co tam jest, w razie potrzeby skoryguję podejście (nie będę przepisywał działającego ConnectionGraph).
- **R3** Email pośrednika może być pusty → przycisk disabled + tooltip.
- **R4** `get_current_tenant_id()` — sprawdzę istnienie helpera (z innych RPC istnieje; fallback `(SELECT tenant_id FROM directors WHERE user_id=auth.uid())`).


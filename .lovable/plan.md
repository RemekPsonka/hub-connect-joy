
Sprint SGU-00 — Foundation + RLS. Migracja schematu (4 nowe tabele + 3 ALTER + 4 helper functions + RLS na 6 tabelach + RPC + seedy) bez UI.

User nie wkleił treści sekcji "Migracja SQL" — w prompcie jest "z PEŁNĄ zawartością sekcji 'Migracja SQL' poniżej (poniżej promptu)", ale po prompcie nic nie ma. Muszę zaprojektować migrację samodzielnie na podstawie wymagań rozsianych w punktach 1, 3, 4, 5.

## Recon (konieczny przed pisaniem migracji)

Wymagania niejasne bez schematu istniejącej bazy:
1. **`deal_teams` schema** — czy ma `tenant_id`? Jak nazywają się role w `deal_team_members`/`deal_teams`?
2. **`deal_team_contacts` schema** — kolumny do dodania w punkcie 3 (ALTER TABLE 3 istniejących tabel)? Brak listy.
3. **`insurance_policies` schema** — j.w.
4. **`contacts` schema** — wymagane w RPC `rpc_sgu_get_crm_contact_basic`.
5. **`app_role` enum** — potwierdzić że `'sgu'` istnieje (prompt to twierdzi).
6. **`insurance_products` schema** — kolumny `has_handling`, `requires_pesel` istnieją czy trzeba dodać?
7. **Istniejące RLS na 6 tabelach** — żeby nie wywalić istniejących polityk SGU.
8. **`directors`/`tenants`** — model multi-tenant (`tenant_id` vs `director_id`).
9. **Czy istnieje rola/team SGU** — query z punktu 5.
10. **`deal_team_members`** — jak rozpoznać `partner` (prompt mówi "Paweł, member team SGU z role='partner'").

## Pytania do usera (krytyczne — bez nich migracja jest zgadywaniem)

Dwa scenariusze:

**A. User zapomniał wkleić sekcję "Migracja SQL"** — najbardziej prawdopodobne. Prompt explicite mówi „z PEŁNĄ zawartością sekcji 'Migracja SQL' poniżej". Ja nie mam tej treści.

**B. User chce, żebym zaprojektował migrację od zera** — wtedy potrzebuję:
- Listy 4 nowych tabel + ich kolumn (`sgu_settings`, `commission_base_split`, + 2 inne — które?)
- Listy 3 ALTER TABLE (które tabele, jakie kolumny)
- Sygnatur 4 helper functions (`get_sgu_team_id`, `is_sgu_partner` znam z walidacji, ale 2 kolejne?)
- Logiki RLS dla 6 tabel (które tabele? Z punktu 4 wynika: `deal_team_contacts`, `insurance_policies`, `contacts` + 3 nowe?)
- Sygnatury RPC `rpc_sgu_get_crm_contact_basic` (parametry, zwracane pola)

Bez tych informacji każda migracja, którą napiszę, będzie zgadywaniem ~400 linii SQL — ryzyko że trzeba będzie wszystko cofać.

## Plan

1. **Krok 0 — recon DB i schema** (mogę zrobić read-only przez `supabase--read_query`):
   - `app_role` enum values
   - `deal_teams`, `deal_team_members`, `deal_team_contacts`, `insurance_policies`, `contacts`, `insurance_products`, `directors` — kolumny i FK
   - Istniejące funkcje: `get_sgu_team_id`, `is_sgu_partner` (mogą już istnieć z poprzednich sprintów)
   - Istniejące tabele: `sgu_settings`, `commission_base_split` (mogą już istnieć)
   - Istniejące RLS na 6 tabelach
   - Wynik query z punktu 5 (zespoły SGU)

2. **Krok 1 — zapytać usera** (questions--ask_questions):
   - Q1 (text, max 4000): wklej pełną treść sekcji "Migracja SQL" — bez tego nie wykonam sprintu.
   - LUB Q2 (choice): czy mam zaprojektować migrację samodzielnie na podstawie reconu, czy przerywam i czekasz aż wkleisz spec?

3. **Krok 2** — po dostaniu odpowiedzi:
   - Jeśli wkleił spec → migracja 1:1, regeneracja types, plik `src/lib/sgu/constants.ts`, walidacja przez `supabase--read_query`, raport.
   - Jeśli każe projektować → projektuję na podstawie reconu, prezentuję jeszcze jeden plan z konkretnym schematem do akceptacji, dopiero potem implementacja.

## Co robię TERAZ (READ-ONLY)

1. `supabase--read_query` — pełen recon schematu (enum, 8 tabel, istniejące funkcje, polityki, zespoły SGU). Wszystko w jednym dużym query lub kilku równoległych.
2. `code--search_files` — sprawdzić czy w repo są już migracje `sgu_*` lub helper `get_sgu_team_id` (mogę o tym nie wiedzieć).
3. Po wynikach reconu → questions--ask_questions z wynikiem reconu w treści pytania, żeby user widział kontekst i mógł zdecydować świadomie.

## Czego NIE robię w tym planie

- Nie piszę migracji "na ślepo" bez treści sekcji "Migracja SQL" lub świadomej zgody usera na projekt od zera.
- Nie regeneruję `types.ts` (auto, po migracji).
- Nie tworzę `src/lib/sgu/constants.ts` przed potwierdzeniem że `'sgu'` jest w enum (po reconie — prawie pewne, ale potwierdzam).
- Nie wykonuję walidacji ani smoke testów RLS — to po migracji.

Po Twojej akceptacji: recon → pytanie z wynikiem reconu → migracja → walidacja → raport.

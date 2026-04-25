# TEST-FLOW-01 — Wznowienie od KROKU 3 do KROKU 14

Kontynuacja E2E flow Roberta Karczewskiego (`deal_team_contacts.id = e964173e...`) w trzech modułach: Kanban / Odprawa / Zadania. Walidacja UI (Stagehand) + SQL po każdym kroku, z twardymi punktami abortu na kategorii deala.

## Kontekst wejściowy

- **Stan po kroku 2.5:** Robert w `Prospekt`, jedno zadanie ("Umów spotkanie", owner_id = `98a271e8...`, assigned_to = Adam Osoba) w meeting_decisions.
- **Znany bug ujawniony:** `TASK-STATUS-AUTOCOMPLETE-BUG #23` — nowe zadania z NextStepDialog pojawiają się jako `completed` zamiast `open`. Test go nie naprawia, tylko obchodzi.
- **Fix wdrożony w poprzednim kroku:** `NextStepDialog.owner_id` lookup → `directors.id` (czeka na commit po raporcie końcowym).
- **Bliźniacze bugi (out-of-scope dla tego flow):** `AddClientTaskDialog.tsx`, `ClientRenewalsTab.tsx` — ticket `NEXTSTEP-OWNER-FIX-02` na później.

## Punkty abortu (HARD STOP)

| Krok | Warunek abortu | Akcja |
|------|----------------|-------|
| 6 (po K2 Handshake) | `deal_team_contacts.category != 'lead'` | ABORT, commit z bugiem, raport |
| 11 (po K4 + dialog składek) | `category != 'client'` LUB `status != 'won'` LUB którekolwiek `client_complexity.*_active = false` | ABORT, commit z bugiem, raport |

Wszystkie inne odchylenia (UX glitche, anomalie statusów zadań per #23, mismatched names) → log do listy odchyleń, kontynuuj.

## Plan kroków

### KROK 3 — Sub-stage „Spotkanie decyzyjne"
- UI: Odprawa → karta Roberta → `OfferingStageStrip` → kliknij "Spotkanie decyzyjne"
- SQL: `SELECT current_sub_stage FROM deal_team_contacts WHERE id=...`
- Walidacja: `current_sub_stage = 'meeting_decisive'` (lub odpowiednik z enum)

### KROK 4 — Zadanie #2 „Przygotuj ofertę"
- UI: NextStepDialog → tytuł "Przygotuj ofertę", wykonawca = Remigiusz Psonka, due +3 dni
- SQL: `SELECT id, title, owner_id, assigned_to, status, due_date FROM tasks WHERE meeting_decision_id IN (... robert ...) ORDER BY created_at DESC`
- Walidacja: 2 zadania, FK owner_id valid w directors

### KROK 5 — Mark zadania #1 jako completed (z modyfikacją)
- 5.1: SQL precheck statusu zadania #1 (`Umów spotkanie`)
- 5.2 **MODYFIKACJA:** jeśli już `completed` (per #23) → pomiń klik, log jako odchylenie, SQL potwierdza istnienie. Jeśli `open` → kliknij checkbox w UI Zadania.
- SQL: `SELECT title, status, completed_at FROM tasks WHERE id=...`

### KROK 6 — K2 Handshake → EstimatedPremiumDialog
- UI: Odprawa → MilestoneActionStrip → klik K2 (handshake icon)
- Dialog: 1 pole „szacowana składka roczna" → wpisz 12000 PLN, submit
- SQL precheck: `SELECT category, milestones FROM deal_team_contacts WHERE id=...`
- **6.5 HARD ABORT CHECK:** `category MUSI = 'lead'`. Jeśli != 'lead' → STOP, commit, raport bugu krytycznego.
- Walidacja kanban: nawigacja do `/deals-team` → kolumna "Lead" → Robert obecny

### KROK 7 — Zadanie #3 „Wyślij ofertę mailem"
- NextStepDialog → wykonawca Paweł Świerczyński, due +1 dzień
- SQL: tasks count = 3, owner_id valid

### KROK 8 — K3 (Decision/Negocjacje)
- UI: MilestoneActionStrip → K3
- SQL: `milestones.k3_*` set, sprawdź czy nie ma side-effect na category

### KROK 9 — Mark zadania #2 jako completed (z modyfikacją per #23)
- Analogicznie do kroku 5

### KROK 10 — Zadanie #4 „Spotkanie podpisanie"
- NextStepDialog → wykonawca Adam Osoba, due +5 dni
- SQL: tasks count = 4

### KROK 11 — K4 Klient → 4-area dialog (KRYTYCZNY)
- UI: MilestoneActionStrip → K4 → dialog 4 obszary (property/financial/communication/life_group)
- Wpisz składki we wszystkich 4 obszarach: 5000 / 8000 / 2000 / 15000 PLN
- Submit
- SQL precheck: pełny stan
  ```sql
  SELECT category, status, client_complexity, milestones, financial_data
  FROM deal_team_contacts WHERE id='e964173e...';
  ```
- **11.3 HARD ABORT CHECK:**
  - `category = 'client'` ✓
  - `status = 'won'` ✓
  - `client_complexity.property_active = true`
  - `client_complexity.financial_active = true`
  - `client_complexity.communication_active = true`
  - `client_complexity.life_group_active = true`
  - Jeśli którekolwiek != oczekiwane → STOP, commit, raport bugu krytycznego

### KROK 12 — Walidacja Kanban → kolumna „Klient"
- Nawigacja `/deals-team` → kolumna Klient → Robert obecny, znika z Lead

### KROK 13 — Walidacja moduł Klienci
- Nawigacja `/clients` (lub odpowiednik) → Robert obecny z 4 aktywnymi obszarami (badges/checkboxy)

### KROK 14 — RAPORT KOŃCOWY

Format:
1. **Wykonane kroki:** lista 3-13 z [✅/⚠️/❌]
2. **Screenshoty kluczowe (4):**
   - K2 EstimatedPremiumDialog
   - Kanban kolumna „Lead" z Robertem (po K2)
   - K4 4-area dialog składek
   - Moduł Klienci — karta Roberta z aktywnymi obszarami
3. **Bugi z reproduktą (każdy = osobny task w trackerze):** opis, kroki repro, oczekiwane vs aktualne, sugerowany fix file
4. **UX odchylenia (raport):** lista bez ticketów (np. status auto-completed per #23, mismatched company names, brak loadera w X)
5. **SQL końcowy stan Roberta:**
   ```sql
   SELECT id, contact_id, category, status, current_sub_stage,
          milestones, client_complexity, financial_data, updated_at
   FROM deal_team_contacts WHERE id='e964173e...';
   SELECT id, title, status, owner_id, assigned_to, due_date, completed_at
   FROM tasks WHERE meeting_decision_id IN (
     SELECT id FROM meeting_decisions WHERE deal_team_contact_id='e964173e...'
   ) ORDER BY created_at;
   ```
   Wszystkie kolumny pokazują spójny stan „klient".

## Commit (po raporcie LUB po hard-abort)

```
fix(odprawa): NEXTSTEP-OWNER-FIX (FK directors.id) + TEST-FLOW-01 walidacja E2E
```

Zawiera:
- `src/components/sgu/odprawa/NextStepDialog.tsx` (lookup directors.id przed insert tasks)
- `supabase/migrations/20260425112627_*.sql` (DROP orphan get_team_directors RPC)
- `supabase/migrations/20260425114246_*.sql` (reset Robert do prospect dla test-flow)
- `.lovable/plan.md` (notatki testowe)

## Narzędzia

- **Stagehand (browser--*):** kliknięcia w Odprawie/Kanban/Klienci, screenshoty, observe przed act przy dialogach
- **supabase--read_query:** każdy SQL precheck/walidacja
- **Migration tool:** tylko jeśli hard-abort wymaga wycofania (nie planowane)
- **Manual fallback:** jeśli Stagehand nie radzi z DatePicker/dropdown → krok opisany słownie + SQL dowód efektu

## Czas

~10-15 min Stagehand + SQL. Hard-abort skraca do <5 min jeśli K2 lub K4 zwracają złą kategorię.

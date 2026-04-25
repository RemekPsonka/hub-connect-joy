# TEST-FLOW-01 — Plan wykonania E2E

## Stan początkowy (z DB)
Robert Karczewski **istnieje** w team SGU (`9842c3d4...`), ale w stanie niespójnym:
- `dtc_id`: `e964173e-e79a-49b8-b21f-b18b87a69eca`
- `contact_id`: `6edd4510-e2d4-4fe3-826c-e97305208772`
- `tenant_id`: `dd293205-6dc1-438e-ad8e-4fd7cdf8f6e5`
- `category='client'` ale `won_at=NULL`, `offering_stage='handshake'`, K1+K2 stamped (pozostałość z poprzedniego testu)

→ **Wymagany RESET** zgodnie z krokiem 0.1.

## Plan wykonania

### KROK 0 — Reset DTC do prospect (migracja SQL)
Migracja: `UPDATE deal_team_contacts SET category='prospect', offering_stage=NULL, status='active', wszystkie milestone_at=NULL, is_lost=false, lost_*=NULL, snoozed_until=NULL, temperature=NULL, expected_annual_premium_gr=NULL, potential_*_gr=NULL, client_complexity='{}'::jsonb WHERE id='e964173e...'`. Walidacja SELECT.

### KROK 1 — Kanban verify
Browser `/sgu/sprzedaz`, znajdź Roberta w kolumnie "Prospekt", screenshot.

### KROK 2 — Odprawa start + zadanie #1
- `/sgu/odprawa`, Startuj odprawę (jeśli trzeba), klik Robert w agendzie
- Verify karta (timeline, "Co się stało", "Co dalej?", OfferingStageStrip)
- "+ Stwórz zadanie" → **STOP CONDITION**: dropdown wykonawcy musi mieć 3 osoby (po fixie). Wybierz #1, +7d, notka "Test E2E krok 2", submit
- SQL: tasks + meeting_decisions.follow_up_task_id
- Screenshot z `/sgu/zadania`

### KROK 3 — Sub-stage "Spotkanie decyzyjne"
Klik sub-stage button, SQL verify `offering_stage='decision_meeting'`, `category='prospect'`.

### KROK 4 — Milestone K1 (Spotkanie odbyte)
Klik [Spotkanie odbyte], verify timeline marker przeskakuje na K1, OfferingStageStrip znika. SQL: `offering_stage='meeting_done'`, `k1_meeting_done_at!=NULL`, `category='prospect'`.

### KROK 5 — Zadanie #2 + close zadania #1
- "+ Stwórz zadanie": "Domknij handshake...", wykonawca #2, +7d
- `/sgu/zadania` → checkbox zadania #1 → status='completed'
- SQL verify 2 wiersze (1 completed, 1 open)

### KROK 6 — Milestone K2 Handshake (KRYTYCZNY)
- Klik [Handshake]
- **EstimatedPremiumDialog** otwiera się → wpisz 200000 → Zapisz
- SQL KRYTYCZNA: `category='lead'` (zmiana!), `offering_stage='handshake'`, `handshake_at!=NULL`, `expected_annual_premium_gr=20000000`
- `/sgu/sprzedaz` verify Robert w kolumnie "Lead", screenshot

### KROK 7 — POA podpisane
Klik [POA podpisane]. SQL: `offering_stage='power_of_attorney'`, `poa_signed_at!=NULL`.

### KROK 8 — Sub-stage "Audyt umówiony"
Klik sub-stage. SQL: `offering_stage='audit_scheduled'`.

### KROK 9 — Milestone K3 (Audyt zrobiony) + zadanie #3
- Klik [Audyt zrobiony]. SQL: `offering_stage='audit_done'`, `audit_done_at!=NULL`, `category='lead'`
- "+ Stwórz zadanie": "Wyślij ofertę...", wykonawca #3, **+3 dni** (custom date), submit

### KROK 10 — Sub-stage "Złożona oferta"
Klik [● Złożona oferta]. SQL: `offering_stage='offer_sent'`.

### KROK 11 — Milestone K4 KLIENT (KRYTYCZNY)
- Klik [Klient]
- **WonPremiumBreakdownDialog** 4 inputy: Majątek 200000, Finansowe 50000, Komunikacja 50000, Życie 30000 → Zapisz
- SQL KRYTYCZNA: `category='client'`, `status='won'`, `offering_stage='won'`, `won_at!=NULL`, wszystkie 4 `potential_*_gr` ustawione (w groszach), `client_complexity` z 4×active=true

### KROK 12 — Segregacja po K4
- `/sgu/odprawa` → Robert ZNIKA z agendy
- `/sgu/sprzedaz` → Robert ZNIKA z kanbana
- `/sgu/klienci` → Robert POJAWIA SIĘ z 4 obszarami aktywnymi, screenshot

### KROK 13 — Zadania w karcie klienta
Karta Roberta w `/sgu/klienci` → tab Zadania → 3 zadania (1 completed, 2 open). SQL końcowy verify follow_up_task_id != NULL na wszystkich 3.

### KROK 14 — RAPORT KOŃCOWY
Markdown z [✅/⚠️/❌] per krok, lista screenshotów (K2 dialog, kanban Lead, K4 dialog, Klienci), bugi, UX odchylenia, SQL końcowy stan Roberta.

## Capabilities required (po approve plan przejdę w default mode)
- **Migracje SQL** (UPDATE deal_team_contacts) — krok 0
- **Browser automation** (Stagehand `navigate_to_sandbox` + `act` + `screenshot`) — kroki 1-13 w preview
- **supabase--read_query** — walidacje SQL po każdym kroku
- Fallback manual smoke jeśli Stagehand nie radzi z dialogami (DatePicker, dropdown shadcn) — raportowane słownie

## Ryzyka
1. **Stagehand vs shadcn Select dropdown** — może wymagać structured mode + observe
2. **DatePicker w zadaniu #3** (+3 dni custom) — najtrudniejszy, mam fallback manual
3. **Auto-advance po stworzeniu zadania** — muszę wracać do agendy ręcznie i klikać Roberta ponownie
4. **EstimatedPremiumDialog/WonPremiumBreakdownDialog** — nie znam selectorów, observe() przed act()
5. **RPC odprawa-agenda** — po K4 Robert musi zniknąć (per AUDIT-FIX-01); jeśli nie zniknie → BUG raport

Czas: ~15-20 min (Stagehand wolniejszy niż 10 min estimate).

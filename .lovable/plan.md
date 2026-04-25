# Co się dzieje po kliknięciu "Umawiamy spotkanie"

## Diagnoza (bez bugów — to świadomy design)

Pasek "Co się stało od ostatniej odprawy?" zawiera dwa różne typy przycisków:

1. **Sub-stages** (przerywana ramka, kropka ●): `Spotkanie decyzyjne`, `Umawiamy spotkanie`, `Spotkanie umówione`, `Handshake`, `POA podpisane`, `Audyt zrobiony` — to **mikro-statusy** wewnątrz tego samego milestone'a (Prospekt / K2+ / K3).
2. **Milestones** (pełna ramka): `Spotkanie odbyte`, `Klient` itd. — przeskakują na kolejny K.

Klik w "Umawiamy spotkanie" trafia do `MilestoneActionStrip.stampSubStage()` (linia 104), który:

- robi `UPDATE deal_team_contacts SET offering_stage='meeting_planning'`
- loguje decyzję `push` z notatką = label sub-stage'a do `deal_team_decisions`
- invaliduje query agendy
- pokazuje toast `Status: Umawiamy spotkanie`

**Żaden dialog się nie otwiera — i nigdy nie miał.** Tylko milestone'y K2 i K4 otwierają dialog (`EstimatedPremiumDialog` / `WonPremiumBreakdownDialog`) przez callback `onPremiumPrompt`. Sub-stages są celowo "1 klik = zapis", bo to tylko zmiana mikro-statusu bez dodatkowych danych.

## Dlaczego nie widać efektu w UI

Po kliknięciu kontakt często wypada z agendy (zmiana `last_status_update` → spada w `priority_bucket`) i panel po prawej znika / przeskakuje na inny kontakt. Toast `Status: Umawiamy spotkanie` w prawym dolnym rogu jest jedynym widocznym potwierdzeniem.

W screenshocie widać że "Spotkanie umówione" jest podświetlone żółto (= `currentOfferingStage`), więc poprzedni klik **zadziałał** — zapisał się w bazie.

## Pytanie do Ciebie

Co chcesz, żeby się działo po kliknięciu sub-stage'a?

**A) Status quo (nic nie zmieniam)** — 1 klik = cichy zapis + toast. Szybko, ale mało wyraźnie.

**B) Mini-dialog z polem daty/notatki** — np. "Umawiamy spotkanie" → dialog z polem "kiedy planowane?" + opcjonalna notatka. Daje to też okazję żeby od razu utworzyć task w `tasks` (zgodnie ze `STAGE_ACTIONS` mapą — `meeting_plan` → `MeetingScheduledDialog`).

**C) Tylko mocniejszy feedback wizualny** — po zapisie zostań na kontakcie, podświetl nowy stan na timeline'ie, pokaż "Zapisano ✓" inline (bez dialogu).

Daj znać który wariant — wtedy zaimplementuję. Domyślnie sugeruję **C** (najmniej tarcia, naprawia główny problem "nie widzę co się stało") z opcjonalnym przejściem do **B** dla `meeting_planning`/`meeting_scheduled` jeśli chcesz spinać to z taskami w `/sgu/zadania`.


# Spójny system zadań i akcji dla lejka SGU

## Diagnoza tego co widać na screenach

W `/sgu/zadania` widać 3 zaległe taski z pustymi tytułami ("Umówić spotkanie", "Umówić spotkanie z . ."). Powód: to **stare orphan-taski bez `deal_team_contact_id`** (brak powiązania z kontaktem). W bazie zespołu SGU jest aktualnie:

- **3 orphan-taski** ("Umówić spotkanie" × 2, "Umówić spotkanie z . ." × 1) — bez kontaktu
- **2 realne taski Karczewskiego** (won) — "Wyślij ofertę mailem", "Spotkanie — podpisanie polisy"
- **Papiernik (meeting_plan)** — pojawia się jako ghost row
- **16 kontaktów w `handshake`, 1 w `audit_scheduled`, 1 w `power_of_attorney`, 3 w `meeting_done`** — wszyscy bez aktywnych tasków, niewidoczni w `/sgu/zadania`

## Cel

Każdy kontakt w lejku ma **dokładnie jeden aktywny task** odpowiadający jego etapowi. Klik w task otwiera dialog adekwatny do etapu, który po potwierdzeniu zamyka task i przesuwa kontakt do kolejnego etapu (tworząc nowy task).

## Mapowanie etapów na akcje

| Etap (offering_stage) | Tytuł zadania | Przycisk w wierszu | Akcja po kliknięciu | Następny etap |
|---|---|---|---|---|
| `meeting_plan` | Umówić spotkanie z {kontakt} | **Umów spotkanie** (Calendar) | `MeetingScheduledDialog` — pole: data spotkania | → `meeting_scheduled` + nowy task "Spotkanie z {kontakt} — {data}" |
| `meeting_scheduled` | Spotkanie z {kontakt} — {data} | **Spotkanie odbyte** (CheckCircle) | `MeetingOutcomeDialog` — radio: handshake / audyt / odłóż / utracony | wg wyboru |
| `meeting_done` | Decyzja po spotkaniu z {kontakt} | **Co dalej?** (ArrowRight) | `NextActionDialog` — handshake / audyt / odłóż / utracony | wg wyboru |
| `handshake` | Oszacuj składkę dla {kontakt} | **Wpisz składkę** (Banknote) | `EstimatedPremiumDialog` *(NOWY)* — pole: szacowana składka PLN | → `audit_scheduled` + task "Umów audyt z {kontakt}" |
| `audit_scheduled` | Umów audyt z {kontakt} | **Ustaw datę audytu** (ClipboardCheck) | `AuditScheduleDialog` *(NOWY)* — pole: data audytu | → `audit_done` + task "Zbierz pełnomocnictwo od {kontakt}" |
| `audit_done` | Zbierz dokumenty od {kontakt} | **Wyślij ofertę** (FileText) | `SendOfferDialog` *(NOWY)* — pole: data wysłania, kanał | → `power_of_attorney` + task "Pełnomocnictwo — {kontakt}" |
| `power_of_attorney` | Pełnomocnictwo od {kontakt} | **Podpisane** (Handshake) | `PoaSignedDialog` *(NOWY)* — checkbox potwierdzenia | → `won` + task "Wyślij ofertę mailem — {kontakt}" |
| `won` | Wyślij ofertę / Podpisanie polisy | **Konwertuj na klienta** (UserCheck) | `ConvertToClientDialog` (istnieje) | → `client` (kontakt zostaje w bazie klientów, task zamknięty) |
| `lost` / `snoozed` | — | brak (kontakt znika z `/sgu/zadania`) | — | — |

## Co zrobić w kodzie

### A. Naprawa wyświetlania (priorytet 1)
1. **Fix orphan-tasków**: w `useDealsTeamAssignments.ts` w `useMyTeamAssignments` filtrować `tasks` które mają `deal_team_contact_id IS NOT NULL`. Orphany pokazywać w osobnej sekcji "Bez przypisania" z przyciskiem "Powiąż z kontaktem" lub "Usuń".
2. **Migracja czyszcząca** (po archiwizacji): dla 3 obecnych orphanów — albo manualnie powiązać z kontaktem, albo `status='cancelled'`.
3. **Tytuły z nazwiskiem**: w ghost-rows i przy tworzeniu nowych tasków zawsze format `{akcja} z {full_name}` (np. "Umówić spotkanie z Papiernik").

### B. Rozszerzenie ghost-rows na wszystkie etapy (priorytet 2)
4. W `useMyTeamAssignments` zmienić query: zamiast tylko `meeting_plan`, generować ghost-rows dla **każdego kontaktu w lejku bez aktywnego tasku**, z tytułem zależnym od `offering_stage` (mapa z tabeli powyżej).
5. Dodać DB-trigger `ensure_active_task_per_lead`: po INSERT/UPDATE `deal_team_contacts.offering_stage`, jeśli nie ma aktywnego tasku — utwórz odpowiedni z mapy.

### C. Mapa etap → dialog w wierszu (priorytet 3)
6. W `MyTeamTasksView.renderTaskRow` zastąpić obecny `onClick`/`onStageBadgeClick` jedną funkcją `getStageAction(task)` która zwraca `{label, icon, dialog}` zgodnie z mapą.
7. Dodać kolumnę **"Następny krok"** w wierszu tasku (zamiast pustego badge) — ikona + label akcji (np. "Wpisz składkę", "Ustaw datę audytu").
8. Klik w tytuł tasku otwiera `TaskDetailSheet` (jak teraz). Klik w przycisk "Następny krok" otwiera odpowiedni dialog.

### D. Nowe dialogi (priorytet 4)
9. Stworzyć 4 brakujące dialogi: `EstimatedPremiumDialog`, `AuditScheduleDialog`, `SendOfferDialog`, `PoaSignedDialog`. Każdy: 1-2 pola formularza + przycisk "Potwierdź" → zamyka stary task (status=`completed`), aktualizuje `offering_stage`, tworzy nowy task na kolejny etap.

### E. Spójność (priorytet 5)
10. `ContactActionButtons` (kafelki etapów na karcie kontaktu) — używać tych samych dialogów co `/sgu/zadania`. Wycofać duplikat logiki tworzenia tasków z `ContactActionButtons` na rzecz wspólnego hooka `useStageTransition(stage, contactId)`.

## Pytania do Ciebie zanim zacznę kodować

1. **Etap `handshake`** — czy "Oszacuj składkę" ma być przed audytem (jak w memory `mem://features/odprawa/k2-k4-premium-dialogs`) czy po? Pytam bo w bazie jest 16 kontaktów w handshake i nie wiem czy to znaczy "uścisk dłoni = wstępna decyzja klienta" czy "K2 = lead".
2. **Czy `audit_done` istnieje** jako etap, czy po audycie idziemy bezpośrednio do `power_of_attorney`? W enum widziałem tylko: `meeting_plan`, `meeting_done`, `handshake`, `audit_scheduled`, `power_of_attorney`, `won` — brak `audit_done`. Mam pominąć ten etap (audyt → POA bez stanu pośredniego)?
3. **Tytuły tasków** — preferujesz "Umówić spotkanie z **Papiernik**" czy "Umówić spotkanie z **Adam Papiernik (Firma X)**"?
4. **Orphan-taski** (3 stare) — kasujemy (`status=cancelled`) czy próbujemy odgadnąć kontakt z tytułu i przypisać manualnie?

Po Twoich odpowiedziach (TAK/NIE/zmień przy każdym wierszu z mapy) wchodzę w implementację.

## Cel
Audyt read-only WSZYSTKICH akcji użytkownika w 5 modułach SGU (Odprawa / Kanban / Zadania / Klienci / Karta kontaktu). Zero zmian w kodzie. Output: jeden plik raportu `analiza/audyt-consistency-2026-04-25.md` z 5 tabelami + listą sprintów.

## Zakres — pliki do analizy (po inwentaryzacji repo)

### A.1 Odprawa (`/sgu/odprawa`) — 16 plików
`SGUOdprawa.tsx`, `MilestoneActionStrip.tsx`, `NextStepDialog.tsx`, `OdprawaExceptionsBar.tsx`, `OperationalActions.tsx`, `AICopilotSidepanel.tsx`, `AIProposalDialog.tsx`, `AgendaAIRefreshButton.tsx`, `EstimatedPremiumDialog.tsx`, `WonPremiumBreakdownDialog.tsx`, `OwnerInlinePicker.tsx`, `ContactTasksInline.tsx`, `OfferingStageStrip.tsx`, `ContactTimeline.tsx`, `ContactHistoryPanel.tsx`, `AgendaList.tsx`
+ hooki: `useOdprawaSession.ts`, `useOdprawaAgenda.ts`, `useGenerateAgendaProposal.ts`, `useAIProposalExecutor.ts`, `useOdprawaSessionDecisions.ts`, `useContactTimelineState.ts`, `useContactHistory.ts`, `useLogDecision.ts`

### A.2 Kanban (`/sgu/sprzedaz`) — ~25 plików
`UnifiedKanban.tsx`, `UnifiedKanbanCard.tsx`, `StageBadge.tsx`, `StageRollbackDialog.tsx`, `LostReasonDialog.tsx`, `ConvertWonToClientDialog.tsx`, `SaveMeetingDialog.tsx`, `PremiumQuickEdit.tsx`, `StalledBadge.tsx`, `ClientStatusBadge.tsx`, `MilestoneBadge.tsx`, `MeetingProgressBar.tsx`, `EditableSubcategoryBadge.tsx`
+ deals-team: `ContactActionButtons.tsx`, `ContactTasksSheet.tsx`, `KanbanBoard.tsx`, `KanbanColumn.tsx`, `ConvertToClientDialog.tsx`, `MeetingDecisionDialog.tsx`, `MeetingOutcomeDialog.tsx`, `MeetingScheduledDialog.tsx`, `NextActionDialog.tsx`, `PromoteDialog.tsx`, `SnoozeDialog.tsx`, `SnoozedContactsBar.tsx`, `SnoozedTeamView.tsx`, `ProspectingConvertDialog.tsx`
+ stage-dialogs: `AuditDoneDialog.tsx`, `AuditScheduleDialog.tsx`, `EstimatedPremiumDialog.tsx`, `PoaSignedDialog.tsx`, `SendOfferDialog.tsx`
+ hooki: `useSguStageTransition.ts`, `useDealsTeamContacts.ts`, `useDealsTeamAssignments.ts`, `useWeeklyStatuses.ts`

### A.3 Zadania (`/sgu/zadania`) — ~6 plików
`SGUTasks.tsx`, `MyTeamTasksView.tsx`, `TasksHeader.tsx`, `TaskRow.tsx`, `TaskStatusPill.tsx`, `TaskDetailSheet.tsx`
+ hooki: `useSGUTasks.ts`, `useTasks.ts`, `useActiveTaskContacts.ts`

### A.4 Klienci (`/sgu/klienci`) — 12 plików
`SGUClients.tsx`, `ClientDetailsDialog.tsx`, `ClientComplexityPanel.tsx`, `ClientRenewalsTab.tsx`, `ClientObszaryTab.tsx`, `ClientPaymentsTab.tsx`, `ClientPortfolioTab.tsx`, `ClientReferralsTab.tsx`, `AddClientTaskDialog.tsx`, `AddExpectedPremiumDialog.tsx`, `AddReferralDialog.tsx`, `ConvertReferralDialog.tsx`, `ClientCommissionsTab.tsx`
+ hooki: `useTeamClients.ts`, `useSGUClientsPortfolio.ts`, `useClientReferrals.ts`, `usePremiumProgress.ts`

### A.5 Karta kontaktu — przekrojowo (występuje w 1 + 2 + 4)
Brak osobnych komponentów — to ten sam `ContactCRMCard` / agenda-card / `ClientDetailsDialog`. W tabeli zaznaczę gdzie te same akcje są re-użyte.

## Plan realizacji (sekwencyjny, ~3-4h Lovable)

### Krok 1 — schema DB (10 min)
- Pobrać kolumny: `tasks`, `deal_team_contacts`, `deal_team_decisions`, `deal_team_activity_log`, `meeting_decisions`, `task_contacts`, `deal_team_client_products`, `deal_team_lost_reasons`.
- Zidentyfikować wszystkie kolumny `*_at` (milestone stamps), `category`, `status`, `is_lost`, `is_closed_won`, `offering_stage`, `won_at`, `snoozed_until`, `assigned_to`, `assigned_to_user_id`, `owner_id`, `due_date`.
- Pobrać listę triggerów na `deal_team_contacts` i `tasks` (`information_schema.triggers`) — żeby wiedzieć jakie efekty uboczne ma UPDATE.

### Krok 2 — A.1 Odprawa (45 min)
Przeczytać każdy plik z A.1, dla każdego przycisku/dialogu wypełnić wiersz tabeli A:
`# | Moduł | Plik | UI Label | DB writes | Tworzy task? (typ a/b/c/d) | Audit?`

### Krok 3 — A.2 Kanban (60 min)
To samo dla A.2. Szczególna uwaga na:
- DnD między kolumnami → który hook? czy wywołuje `useSguStageTransition`?
- 5 dialogów `stage-dialogs/*` vs odpowiedniki w deals-team (`MeetingOutcomeDialog`, `NextActionDialog`) — czy duplikacja?
- `ContactActionButtons` 11 akcji — porównanie z `MilestoneActionStrip` w odprawie.

### Krok 4 — A.3 Zadania (20 min)
Szybko — tylko quick actions na `TaskRow` (complete/snooze/edit) + filtrowanie (`useSGUTasks`).

### Krok 5 — A.4 Klienci (30 min)
Akcje konwersji + renewal + complexity + premium edit.

### Krok 6 — Tabela B (DB writes per akcja, 20 min)
Pivot tabeli A: dla każdej kolumny (np. `offering_stage`) wypisać które akcje ją modyfikują. Pokazuje hot-spots.

### Krok 7 — Tabela C: rozjazdy (30 min)
- 🔴 KRYTYCZNE: ta sama akcja UI, różny efekt w bazie (np. „Klient" w odprawie K4 vs Kanban Convert).
- 🟡 ŚREDNIE: ta sama akcja, różne ścieżki kodu (np. dwa różne dialogi „Spotkanie odbyte").
- 🟢 LEKKIE: duplikacja UX (label w 2 miejscach, baza OK).
- Pole spójności: `category` vs `status` vs `is_lost` vs `offering_stage='lost'` vs `is_closed_won` vs `won_at`.

### Krok 8 — Tabela D: klasyfikacja tasks (20 min)
Dla każdego miejsca z `tasks.insert(...)`:
- `due_date` required/optional/zawsze NULL
- `assigned_to` / `assigned_to_user_id` — kto, jak ustawiane
- Czy linkuje się z `meeting_decisions.follow_up_task_id`
- Klasyfikacja: pełne / TODO / auto / imported

Już teraz znanych miejsc INSERT do `tasks`: `useTasks.ts`, `WeeklyStatusForm.tsx`, `useSovraDebrief.ts`, `useProjectTemplates.ts`, `AddClientTaskDialog.tsx`, `ClientRenewalsTab.tsx`, `useSguStageTransition.ts` (przez nasz dzisiejszy fix).

### Krok 9 — Lista E: sprinty (15 min)
Posortowane po severity → konkretne sprinty z estymatami (np. „Sprint K-Convert: zunifikuj ConvertToClient — 6h").

### Krok 10 — Zapis raportu (5 min)
Plik `analiza/audyt-consistency-2026-04-25.md` z 5 tabelami + listą sprintów. ZERO zmian w innych plikach.

## Format raportu

```markdown
# AUDIT-CONSISTENCY-01 — SGU 2026-04-25

## TL;DR
- N akcji zinwentaryzowanych w M modułach
- X rozjazdów krytycznych, Y średnich, Z lekkich
- Top-3 sprinty: ...

## Tabela A — Inwentarz akcji (~80-120 wierszy)
| # | Moduł | Plik | UI Label | DB writes | Tworzy task? | Audit? |

## Tabela B — DB writes per kolumna
| Kolumna | Liczba miejsc piszących | Akcje |

## Tabela C — Rozjazdy (severity-sorted)
| Severity | Akcja | Miejsca | Różnica | Sugestia |

## Tabela D — Klasyfikacja tasks
| Miejsce INSERT | due_date | assigned_to | linkuje meeting_decision? | Typ |

## Lista E — Sprinty post-audit
| # | Sprint | Severity | Estymat h | Pliki |
```

## Czego NIE zrobię
- Żadnych zmian w kodzie ani bazie.
- Żadnych nowych migracji.
- Żadnych edycji istniejących komponentów.
Wyłącznie nowy plik `analiza/audyt-consistency-2026-04-25.md`.

## Pytania doprecyzowujące (1)
Czy raport ma być po **polsku** (jak project knowledge sugeruje) czy po **angielsku** (komentarze techniczne)? Domyślnie zrobię **po polsku** dla konsystencji z resztą `analiza/*`.

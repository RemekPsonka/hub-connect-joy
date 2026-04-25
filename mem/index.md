# Project Memory

## Core
Network Assistant (CRM Moj + SGU). Polski UI, sentence case, daty DD.MM.YYYY, kwoty w groszach (int).
Lejek SGU: meeting_plan→meeting_scheduled→meeting_done→handshake→power_of_attorney→audit_scheduled→audit_done→won.
Tytuły tasków SGU: "{akcja} — {Imię Nazwisko} ({Firma})". Każdy kontakt w lejku ma 1 aktywny task (ghost row jeśli brak).
Nie używaj `pipeline_stages`/`deals` (legacy). Główny lejek = `deal_team_contacts`.
Sovra write-access zawsze z confirm dialog. Tool calls przez `_shared/sovra-tools.ts`.

## Memories
- [SGU stage→action map](mem://features/sgu/stage-action-map) — Centralna mapa etapów lejka, dialogi, ghost rows, format tytułów
- [SGU reports flag](mem://features/sgu/reports-feature-flag) — Pozycja Raporty w sidebarze SGU za feature flagiem
- [K2-K4 premium dialogs](mem://features/odprawa/k2-k4-premium-dialogs) — Milestones K2 (handshake) lead + EstimatedPremiumDialog
- [Odprawa agenda sections](mem://features/odprawa/agenda-grouped-sections) — Pre-brief AI w 5 sekcjach (Pilne/Stalled/10x/Follow-up/Nowi) + sumka + sticky headers
- [Background jobs](mem://features/background-jobs-system) — Pattern enqueue→worker→toast
- [Unified meetings](mem://features/meetings/unified-view) — VIEW unified_meetings + useUnifiedMeetings
- [Network graph](mem://features/network-graph) — connections + rpc_contact_neighbors
- [Gmail full sync](mem://features/gmail-full-sync) — gmail_threads/messages/labels + /inbox 3-kol
- [Gmail integration](mem://features/gmail-integration) — Wysyłka maili, narzędzia Sovry
- [Dashboard MyDay](mem://features/dashboard-myday) — Strona główna jako codzienny brief
- [Scheduling pg-cron](mem://technical/scheduling-pg-cron) — pg_cron + pg_net + helper schedule_edge_function

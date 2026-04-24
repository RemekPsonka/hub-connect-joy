---
name: SGU Odprawa module
description: Cykliczna odprawa zespołu SGU — sesje + agenda kontaktów z lejka. Tabela odprawa_sessions (jedna otwarta per zespół), RPC get_odprawa_agenda sortuje 10x → pytania → stalled → hot → top → reszta. Strony /sgu/odprawa i /sgu/odprawa/historia. Hooki w src/hooks/sgu/.
type: feature
---
- Tabela: odprawa_sessions (tenant_id, team_id, started_by=auth.uid(), status open/closed/abandoned, covered_contact_ids uuid[]).
- Unikalny indeks: jedna 'open' sesja per team_id.
- RLS: is_deal_team_member(auth.uid(), team_id) OR is_tenant_admin(auth.uid(), tenant_id) OR is_superadmin(auth.uid()). DELETE tylko admin.
- RPC public.get_odprawa_agenda(p_team_id) SECURITY DEFINER, sortowanie po priority_bucket: 1=10x, 2=open questions>0, 3=stalled (no active task + (next_action IS NULL OR < now())), 4=hot, 5=top, 6=reszta.
- Hooki: useOdprawaAgenda, useActiveOdprawaSession, useStartOdprawa, useAbandonOdprawa+useCloseOdprawa, useOdprawaHistory.
- UI: PriorityBadge, AgendaItemCard, OdprawaAgendaList, OdprawaSessionHeader, OdprawaHistoryList.
- Sidebar: pozycja "Odprawa" po "Raporty", ikona ClipboardCheck, bez gatingu.

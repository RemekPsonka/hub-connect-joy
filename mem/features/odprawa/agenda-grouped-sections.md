---
name: Pre-brief odprawy AI z sekcjami grupującymi
description: AgendaList renderuje 5 sekcji priorytetu (Pilne/Stalled/10x/Follow-up/Nowi) zamiast płaskiej listy
type: feature
---
Lewa kolumna `/sgu/odprawa` renderuje wiersze pogrupowane w sekcje AI:
🔥 urgent, 🎯 10x, ⚠️ stalled, 📞 followup, 🆕 new_prospects.

`ai_agenda_proposals.grouped_sections` jsonb = `[{key,label,icon,contacts:[{contact_id,reason}]}]`.
Dedup: każdy contact MAX w 1 sekcji (priorytet urgent>10x>stalled>followup>new_prospects).
NULL grouped_sections → fallback `ranked_contacts`, sekcja `_other`.

RPC `get_odprawa_agenda` zwraca `ai_section_key/label/icon`. Edge `agenda-builder` tool `submit_grouped_agenda`.
UI: sumka u góry + sticky headers `sticky top-0 bg-background`.

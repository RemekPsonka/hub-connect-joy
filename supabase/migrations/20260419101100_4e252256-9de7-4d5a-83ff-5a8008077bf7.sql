-- Sprint 19b — Rationale komentarz na VIEW unified_meetings
COMMENT ON VIEW public.unified_meetings IS
  'Unia consultations + group_meetings. DECYZJA Sprint 19b: one_on_one_meetings CELOWO POMINIĘTE — one-on-one jest podtypem group_meeting i jest widoczne w detalu grupowego. Nie dodawać do UNION bez warsztatu z Remkiem.';
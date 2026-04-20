CREATE OR REPLACE FUNCTION public.rpc_contact_timeline(
  p_contact_id uuid,
  p_filter text DEFAULT 'all',
  p_limit int DEFAULT 50,
  p_before timestamptz DEFAULT NULL
)
RETURNS TABLE (
  kind text,
  id uuid,
  ts timestamptz,
  title text,
  preview text,
  author text,
  meta jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  WITH u AS (
    SELECT 'note'::text AS kind, cn.id, cn.created_at AS ts,
           'Notatka'::text AS title,
           substring(cn.content, 1, 200) AS preview,
           COALESCE(d.full_name, 'Ty')::text AS author,
           jsonb_build_object('length', length(cn.content)) AS meta
    FROM public.contact_notes cn
    LEFT JOIN public.directors d ON d.id = cn.created_by
    WHERE cn.contact_id = p_contact_id

    UNION ALL
    SELECT 'email'::text, gm.id, gm.date AS ts,
           COALESCE(gm.subject, '(brak tematu)')::text,
           substring(COALESCE(gm.body_plain, ''), 1, 200),
           COALESCE(gm."from", '')::text,
           jsonb_build_object('thread_id', gm.thread_id)
    FROM public.gmail_messages gm
    JOIN public.gmail_threads gt ON gt.id = gm.thread_id
    WHERE gt.contact_id = p_contact_id

    UNION ALL
    SELECT 'meeting'::text, ge.id, ge.start_at AS ts,
           COALESCE(ge.summary, 'Spotkanie')::text,
           substring(COALESCE(ge.description, ''), 1, 200),
           'GCal'::text,
           jsonb_build_object('duration_min', EXTRACT(epoch FROM (ge.end_at - ge.start_at))/60)
    FROM public.gcal_events ge
    JOIN public.gcal_event_links gel
      ON gel.gcal_event_id = ge.gcal_event_id
     AND gel.linked_type = 'contact'
     AND gel.linked_id = p_contact_id

    UNION ALL
    SELECT 'ai_signal'::text, am.id, am.created_at AS ts,
           'Sovra'::text,
           substring(COALESCE(am.content, ''), 1, 200),
           'Sovra'::text,
           jsonb_build_object('model', am.model)
    FROM public.ai_messages am
    JOIN public.ai_conversations ac ON ac.id = am.conversation_id
    WHERE ac.scope_type = 'contact'
      AND ac.scope_id = p_contact_id
      AND am.role = 'assistant'
  )
  SELECT u.kind, u.id, u.ts, u.title, u.preview, u.author, u.meta FROM u
  WHERE (p_before IS NULL OR u.ts < p_before)
    AND (
      p_filter = 'all'
      OR (p_filter = 'email' AND u.kind = 'email')
      OR (p_filter = 'meeting' AND u.kind = 'meeting')
      OR (p_filter = 'note' AND u.kind = 'note')
      OR (p_filter = 'ai_signals' AND u.kind = 'ai_signal')
    )
  ORDER BY u.ts DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_contact_timeline(uuid, text, int, timestamptz) TO authenticated;

-- ROLLBACK: DROP FUNCTION IF EXISTS public.rpc_contact_timeline(uuid, text, int, timestamptz);

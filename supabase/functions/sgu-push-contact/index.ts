import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Stage = 'prospect' | 'lead' | 'offering' | 'client';
const ALLOWED_STAGES: Stage[] = ['prospect', 'lead', 'offering', 'client'];

interface PushBody {
  contact_id: string;
  team_id?: string;
  stage?: Stage;
  expected_annual_premium_gr?: number;
  notes?: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'no_auth' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userRes, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userRes?.user) return json({ error: 'unauthorized' }, 401);

    const body = (await req.json().catch(() => null)) as PushBody | null;
    if (!body || typeof body.contact_id !== 'string' || !body.contact_id) {
      return json({ error: 'contact_id_required' }, 400);
    }
    const contact_id = body.contact_id;

    const stage: Stage =
      body.stage && ALLOWED_STAGES.includes(body.stage) ? body.stage : 'lead';

    const expected_annual_premium_gr =
      typeof body.expected_annual_premium_gr === 'number' && body.expected_annual_premium_gr >= 0
        ? Math.floor(body.expected_annual_premium_gr)
        : 0;
    const notes =
      typeof body.notes === 'string' && body.notes.trim().length > 0
        ? body.notes.trim().slice(0, 500)
        : null;

    // 1. director check
    const { data: directorId, error: dirErr } = await supabase.rpc('get_current_director_id');
    if (dirErr) return json({ error: 'director_check_failed', details: dirErr.message }, 500);
    if (!directorId) return json({ error: 'only_director_can_push' }, 403);

    // 2. tenant
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_current_tenant_id');
    if (tenantErr) return json({ error: 'tenant_lookup_failed', details: tenantErr.message }, 500);
    if (!tenantId) return json({ error: 'no_tenant' }, 500);

    // 3. team_id resolution + membership check
    let team_id = typeof body.team_id === 'string' && body.team_id ? body.team_id : null;
    if (!team_id) {
      const { data: sguTeamId, error: teamErr } = await supabase.rpc('get_sgu_team_id');
      if (teamErr) return json({ error: 'sgu_team_lookup_failed', details: teamErr.message }, 500);
      if (!sguTeamId) return json({ error: 'no_team_specified' }, 400);
      team_id = sguTeamId as string;
    } else {
      // walidacja: dyrektor musi należeć do team_id (1-arg overload korzysta z auth.uid())
      const { data: isMember, error: memberErr } = await supabase.rpc('is_deal_team_member', {
        p_team_id: team_id,
      });
      if (memberErr) {
        return json({ error: 'team_membership_check_failed', details: memberErr.message }, 500);
      }
      if (!isMember) return json({ error: 'not_team_member' }, 403);
    }

    // 4. validate contact in tenant
    const { data: contactRow, error: contactErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (contactErr) return json({ error: 'contact_lookup_failed', details: contactErr.message }, 500);
    if (!contactRow) return json({ error: 'contact_not_found' }, 404);

    // 5. idempotency — already pushed to THIS team?
    const { data: existing, error: existErr } = await supabase
      .from('deal_team_contacts')
      .select('id')
      .eq('team_id', team_id)
      .eq('source_contact_id', contact_id)
      .maybeSingle();
    if (existErr) return json({ error: 'existing_lookup_failed', details: existErr.message }, 500);
    if (existing) {
      return json({ deal_team_contact_id: existing.id, team_id, stage, created: false });
    }

    // 6. mapowanie stage → category/status
    const status = stage === 'client' ? 'won' : 'new';

    const { data: inserted, error: insertErr } = await supabase
      .from('deal_team_contacts')
      .insert({
        tenant_id: tenantId,
        team_id,
        contact_id,
        source_contact_id: contact_id,
        category: stage,
        status,
        prospect_source: 'crm_push',
        expected_annual_premium_gr,
        notes,
      })
      .select('id')
      .single();

    if (insertErr) {
      const code = (insertErr as { code?: string }).code;
      if (code === '23505') {
        const { data: raceRow } = await supabase
          .from('deal_team_contacts')
          .select('id')
          .eq('team_id', team_id)
          .eq('source_contact_id', contact_id)
          .maybeSingle();
        if (raceRow) return json({ deal_team_contact_id: raceRow.id, team_id, stage, created: false });
      }
      return json({ error: 'insert_failed', details: insertErr.message }, 500);
    }

    return json({ deal_team_contact_id: inserted.id, team_id, stage, created: true });
  } catch (e) {
    return json({ error: 'internal', details: e instanceof Error ? e.message : String(e) }, 500);
  }
});

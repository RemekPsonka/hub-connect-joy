import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AddLeadBody {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  company_name?: string | null;
  nip?: string | null;
  expected_annual_premium_pln?: number;
  notes?: string | null;
  source?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanPhone(p?: string | null): string | null {
  if (!p) return null;
  const c = p.replace(/\s|-/g, '');
  return c || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    // SGU access — partner OR director
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: isPartner } = await userClient.rpc('is_sgu_partner');
    const { data: directorId } = await userClient.rpc('get_current_director_id');
    if (!isPartner && !directorId) return json({ error: 'forbidden' }, 403);

    const { data: sguTeamId } = await userClient.rpc('get_sgu_team_id');
    if (!sguTeamId) return json({ error: 'sgu_team_not_configured' }, 500);

    const body = (await req.json().catch(() => null)) as AddLeadBody | null;
    if (!body) return json({ error: 'invalid_body' }, 400);

    const fullName = (body.full_name || '').trim();
    if (fullName.length < 2) return json({ error: 'full_name_too_short' }, 400);

    const phone = cleanPhone(body.phone);
    if (phone && !/^(\+48)?[0-9]{9,13}$/.test(phone)) {
      return json({ error: 'invalid_phone' }, 400);
    }
    const email = body.email?.trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'invalid_email' }, 400);
    }
    const premiumPln = typeof body.expected_annual_premium_pln === 'number'
      ? Math.max(0, body.expected_annual_premium_pln)
      : 0;
    const notes = body.notes?.trim().slice(0, 500) || null;
    const source = (body.source || 'manual').trim().slice(0, 100);

    // Dedup: scan SGU team for matching phone or email
    if (phone || email) {
      const { data: candidates } = await supabase
        .from('deal_team_contacts')
        .select('id, contacts!inner(phone, email)')
        .eq('team_id', sguTeamId);
      const dup = (candidates ?? []).find((row) => {
        const c = (row as unknown as { contacts: { phone: string | null; email: string | null } }).contacts;
        if (phone && c.phone === phone) return true;
        if (email && c.email && c.email.toLowerCase() === email.toLowerCase()) return true;
        return false;
      });
      if (dup) {
        return json({ deal_team_contact_id: dup.id, created: false, duplicate: true });
      }
    }

    // INSERT contacts (minimal)
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        tenant_id: auth.tenantId,
        full_name: fullName,
        phone,
        email,
        source: `sgu_${source}`,
        created_by_user_id: auth.user.id,
      })
      .select('id')
      .single();

    if (contactErr || !newContact) {
      return json({ error: 'contact_insert_failed', details: contactErr?.message }, 500);
    }

    // INSERT deal_team_contacts
    const { data: dtc, error: dtcErr } = await supabase
      .from('deal_team_contacts')
      .insert({
        tenant_id: auth.tenantId,
        team_id: sguTeamId,
        contact_id: newContact.id,
        source_contact_id: null,
        category: 'lead',
        status: 'new',
        expected_annual_premium_gr: Math.round(premiumPln * 100),
        notes,
      })
      .select('id')
      .single();

    if (dtcErr || !dtc) {
      return json({ error: 'dtc_insert_failed', details: dtcErr?.message }, 500);
    }

    return json({
      deal_team_contact_id: dtc.id,
      contact_id: newContact.id,
      created: true,
      duplicate: false,
    });
  } catch (e) {
    return json({ error: 'internal', details: e instanceof Error ? e.message : String(e) }, 500);
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AddLeadBody {
  company_name: string;
  nip?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
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

    const companyName = (body.company_name || '').trim();
    if (companyName.length < 2) return json({ error: 'company_name_too_short' }, 400);
    if (companyName.length > 200) return json({ error: 'company_name_too_long' }, 400);

    const nipRaw = (body.nip || '').trim();
    if (nipRaw && !/^[0-9]{10}$/.test(nipRaw)) {
      return json({ error: 'invalid_nip' }, 400);
    }
    const nip = nipRaw || null;

    const personName = (body.full_name || '').trim();
    if (personName && personName.length > 120) {
      return json({ error: 'full_name_too_long' }, 400);
    }
    // contacts.full_name is NOT NULL — fallback to company name when person not provided.
    const fullName = personName || companyName;

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

    // Optional: link to existing company by NIP (soft match, nie blokuje deduplikacji).
    let companyId: string | null = null;
    if (nip) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('nip', nip)
        .maybeSingle();
      if (existingCompany?.id) {
        companyId = existingCompany.id;
      }
    }

    // INSERT contacts (firma-first; full_name = osoba lub fallback do nazwy firmy)
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        tenant_id: auth.tenantId,
        full_name: fullName,
        company: companyName,
        company_id: companyId,
        phone,
        email,
        source: `sgu_${source}`,
        director_id: directorId,
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
        status: 'active',
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

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LeadInput {
  full_name?: string;
  phone?: string | null;
  email?: string | null;
  company_name?: string | null;
  nip?: string | null;
  notes?: string | null;
}

interface ImportBody {
  leads: LeadInput[];
  source: string;
  preset_name?: string;
  column_mapping?: Record<string, string>;
  dry_run?: boolean;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanPhone(p?: string | null): string | null {
  if (!p) return null;
  const c = String(p).replace(/\s|-/g, '');
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

    const body = (await req.json().catch(() => null)) as ImportBody | null;
    if (!body || !Array.isArray(body.leads)) return json({ error: 'invalid_body' }, 400);
    if (body.leads.length > 500) return json({ error: 'batch_too_large_max_500' }, 400);

    const source = (body.source || 'csv_import').trim().slice(0, 100);
    const dryRun = !!body.dry_run;

    // Pre-fetch existing phone/email in SGU team
    const { data: existing } = await supabase
      .from('deal_team_contacts')
      .select('contacts!inner(phone, email)')
      .eq('team_id', sguTeamId);
    const existingPhones = new Set<string>();
    const existingEmails = new Set<string>();
    for (const row of existing ?? []) {
      const c = (row as unknown as { contacts: { phone: string | null; email: string | null } }).contacts;
      if (c.phone) existingPhones.add(c.phone);
      if (c.email) existingEmails.add(c.email.toLowerCase());
    }

    const errors: { row: number; message: string }[] = [];
    const toInsert: { idx: number; lead: LeadInput; phone: string | null; email: string | null }[] = [];
    let skippedDuplicates = 0;

    body.leads.forEach((lead, idx) => {
      const fullName = (lead.full_name || '').trim();
      if (fullName.length < 2) {
        errors.push({ row: idx, message: 'full_name_too_short' });
        return;
      }
      const phone = cleanPhone(lead.phone);
      const email = lead.email?.trim().toLowerCase() || null;
      if ((phone && existingPhones.has(phone)) || (email && existingEmails.has(email))) {
        skippedDuplicates++;
        return;
      }
      // Mark as added to avoid in-batch duplicates
      if (phone) existingPhones.add(phone);
      if (email) existingEmails.add(email);
      toInsert.push({ idx, lead: { ...lead, full_name: fullName }, phone, email });
    });

    if (dryRun) {
      return json({
        dry_run: true,
        would_insert: toInsert.length,
        would_skip: skippedDuplicates,
        errors,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      // Batch INSERT contacts
      const contactRows = toInsert.map((it) => ({
        tenant_id: auth.tenantId,
        full_name: it.lead.full_name as string,
        phone: it.phone,
        email: it.email,
        source: `sgu_${source}`,
        created_by_user_id: auth.user.id,
      }));
      const { data: newContacts, error: cErr } = await supabase
        .from('contacts')
        .insert(contactRows)
        .select('id');
      if (cErr || !newContacts) {
        return json({ error: 'contacts_insert_failed', details: cErr?.message }, 500);
      }

      const dtcRows = newContacts.map((c, i) => ({
        tenant_id: auth.tenantId,
        team_id: sguTeamId,
        contact_id: c.id,
        source_contact_id: null,
        category: 'lead',
        status: 'new',
        expected_annual_premium_gr: 0,
        notes: toInsert[i].lead.notes?.toString().slice(0, 500) || null,
      }));
      const { data: newDtc, error: dErr } = await supabase
        .from('deal_team_contacts')
        .insert(dtcRows)
        .select('id');
      if (dErr) {
        return json({ error: 'dtc_insert_failed', details: dErr.message, partial_contacts: newContacts.length }, 500);
      }
      inserted = newDtc?.length ?? 0;
    }

    // Upsert preset
    if (body.preset_name && body.column_mapping) {
      await supabase
        .from('sgu_csv_import_presets')
        .upsert(
          {
            tenant_id: auth.tenantId,
            name: body.preset_name.trim().slice(0, 100),
            column_mapping: body.column_mapping,
            created_by_user_id: auth.user.id,
            last_used_at: new Date().toISOString(),
            usage_count: 1,
          },
          { onConflict: 'tenant_id,name' },
        );
    }

    return json({ inserted, skipped_duplicates: skippedDuplicates, errors });
  } catch (e) {
    return json({ error: 'internal', details: e instanceof Error ? e.message : String(e) }, 500);
  }
});

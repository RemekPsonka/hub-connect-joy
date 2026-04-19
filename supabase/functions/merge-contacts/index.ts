import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified contact merge endpoint.
 *
 * Three input shapes (auto-detected):
 *
 * 1) BUSINESS-CARD MERGE (legacy single shape — wizytówki ⟶ istniejący kontakt):
 *    { existingContactId, newContactData }
 *    Łączy newContactData w istniejący kontakt (smart phone/email/address handling,
 *    auto-create company z domeny e-maila). Bez transferu rekordów / soft-delete.
 *
 * 2) BULK-PAIR MERGE (kontakt → kontakt):
 *    { primaryContactId, secondaryContactId, mergedFields }
 *    Aktualizuje primary o mergedFields, przenosi powiązane rekordy
 *    (needs/offers/tasks/consultations/connections/audit), soft-delete'uje secondary.
 *
 * 3) PAIRS ARRAY (wiele par naraz):
 *    { pairs: [{ target_id, source_ids, merged_fields? }] }
 *    Iteruje po parach, dla każdej (target_id, source_id) wywołuje shape #2 inline.
 */

// =================== HELPERS ===================

function isMobileNumber(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  if (/^\+48[5-8]\d{8}$/.test(digits)) return true;
  if (/^[5-8]\d{8}$/.test(digits)) return true;
  return false;
}

function isLandlineNumber(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  if (/^\+48[1-4]\d+$/.test(digits)) return true;
  if (/^[1-4]\d+$/.test(digits) && digits.length >= 7) return true;
  return false;
}

// =================== BUSINESS-CARD MERGE (shape #1) ===================

async function mergeBusinessCardData(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  existingContactId: string,
  newContactData: Record<string, any>
) {
  const { data: existingContact, error: fetchError } = await supabase
    .from('contacts').select('*').eq('id', existingContactId).single();

  if (fetchError || !existingContact) {
    return { ok: false, status: 404, error: 'Existing contact not found' };
  }

  const mergedData: Record<string, any> = {};

  const simpleFields = ['company', 'position', 'city', 'linkedin_url', 'source', 'primary_group_id', 'business_card_image_url'];
  for (const field of simpleFields) {
    if (!existingContact[field] && newContactData[field]) {
      mergedData[field] = newContactData[field];
    }
  }

  // Smart phone handling
  const existingPhone = existingContact.phone;
  const existingPhoneBusiness = existingContact.phone_business;
  const newPhone = newContactData.phone;
  const newPhoneBusiness = newContactData.phone_business;

  if (newPhone) {
    if (!existingPhone) {
      mergedData.phone = newPhone;
    } else if (existingPhone !== newPhone) {
      const existingIsLandline = isLandlineNumber(existingPhone);
      const existingIsMobile = isMobileNumber(existingPhone);
      const newIsMobile = isMobileNumber(newPhone);
      if (existingIsLandline && newIsMobile) {
        mergedData.phone = newPhone;
        if (!existingPhoneBusiness) mergedData.phone_business = existingPhone;
      } else if (!existingIsMobile && newIsMobile && !existingPhoneBusiness) {
        mergedData.phone = newPhone;
        mergedData.phone_business = existingPhone;
      }
    }
  }
  if (newPhoneBusiness && !existingPhoneBusiness && !mergedData.phone_business) {
    mergedData.phone_business = newPhoneBusiness;
  }

  // Email
  if (newContactData.email) {
    const newEmail = newContactData.email.toLowerCase().trim();
    const existingEmail = existingContact.email?.toLowerCase().trim();
    if (!existingEmail) mergedData.email = newContactData.email;
    else if (newEmail !== existingEmail && !existingContact.email_secondary) {
      mergedData.email_secondary = newContactData.email;
    }
  }

  // Address
  if (newContactData.address) {
    const newAddress = newContactData.address.trim();
    const existingAddress = existingContact.address?.trim();
    if (!existingAddress) mergedData.address = newContactData.address;
    else if (newAddress !== existingAddress && !existingContact.address_secondary) {
      mergedData.address_secondary = newContactData.address;
    }
  }

  // Auto-create company
  let companyCreated = false;
  let companyId = existingContact.company_id || newContactData.company_id;
  const companyName = newContactData.company || existingContact.company;

  if (!companyId && companyName) {
    const { data: existingCompany } = await supabase
      .from('companies').select('id, name')
      .eq('tenant_id', tenantId).ilike('name', companyName).maybeSingle();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const companyCity = newContactData.city || existingContact.city || null;
      const email = newContactData.email || existingContact.email;
      let companyWebsite: string | null = null;
      if (email) {
        const parts = email.split('@');
        if (parts.length === 2) {
          const domain = parts[1].toLowerCase();
          const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl', 'hotmail.com', 'icloud.com', 'live.com', 'me.com', 'protonmail.com', 'tutanota.com'];
          if (!publicDomains.includes(domain)) companyWebsite = `https://${domain}`;
        }
      }
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({ tenant_id: tenantId, name: companyName, city: companyCity, website: companyWebsite })
        .select('id').single();
      if (!companyError && newCompany) {
        companyId = newCompany.id;
        companyCreated = true;
      }
    }
    if (companyId) mergedData.company_id = companyId;
  }

  // Tags
  const existingTags = new Set(existingContact.tags || []);
  const newTags = new Set(newContactData.tags || []);
  const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
  if (JSON.stringify(mergedTags) !== JSON.stringify(existingContact.tags || [])) {
    mergedData.tags = mergedTags;
  }

  // Notes
  if (newContactData.notes && existingContact.notes !== newContactData.notes) {
    mergedData.notes = !existingContact.notes
      ? newContactData.notes
      : `${existingContact.notes}\n\n---\n\n${newContactData.notes}`;
  }

  if (Object.keys(mergedData).length > 0) {
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ ...mergedData, updated_at: new Date().toISOString() })
      .eq('id', existingContactId);
    if (updateError) throw updateError;

    await supabase.from('audit_log').insert({
      tenant_id: tenantId, entity_type: 'contact', entity_id: existingContactId,
      actor_id: null, action: 'merge', diff: {},
      metadata: { merged_contact_data: newContactData, merge_source: 'business_card' }
    });
    await supabase.from('audit_log').insert({
      tenant_id: tenantId, entity_type: 'contact', entity_id: existingContactId,
      actor_id: null, action: 'merged', diff: {},
      metadata: {
        description: companyCreated
          ? `Kontakt scalony z danymi wizytówki. Utworzono firmę: ${companyName}`
          : 'Kontakt został scalony z danymi wizytówki',
        fields_updated: Object.keys(mergedData),
        source: 'business_card',
        company_created: companyCreated,
        company_id: companyId,
      }
    });
  }

  const { data: updatedContact } = await supabase.from('contacts').select('*').eq('id', existingContactId).single();
  return {
    ok: true,
    contact: updatedContact,
    merged: true,
    fieldsUpdated: Object.keys(mergedData),
    companyCreated,
    companyId,
  };
}

// =================== BULK PAIR MERGE (shape #2) ===================

const BULK_ALLOWED_FIELDS = [
  'full_name', 'first_name', 'last_name', 'email', 'email_secondary',
  'phone', 'phone_business', 'company', 'company_id', 'position',
  'city', 'linkedin_url', 'source', 'address', 'address_secondary',
  'notes', 'profile_summary', 'primary_group_id', 'relationship_strength',
  'tags', 'title', 'met_date', 'met_source'
];

async function mergePairContacts(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  primaryContactId: string,
  secondaryContactId: string,
  mergedFields: Record<string, any>
) {
  const { data: contacts, error: fetchError } = await supabase
    .from('contacts').select('id, full_name, tenant_id')
    .in('id', [primaryContactId, secondaryContactId]).eq('tenant_id', tenantId);
  if (fetchError || !contacts || contacts.length !== 2) {
    return { ok: false, status: 404, error: 'One or both contacts not found or not accessible' };
  }
  const secondaryName = contacts.find(c => c.id === secondaryContactId)?.full_name || 'Unknown';

  const sanitizedFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(mergedFields ?? {})) {
    if (BULK_ALLOWED_FIELDS.includes(key)) sanitizedFields[key] = value;
  }
  sanitizedFields.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('contacts').update(sanitizedFields).eq('id', primaryContactId);
  if (updateError) throw updateError;

  // Transfer related
  const transferTables = [
    { table: 'needs', column: 'contact_id' },
    { table: 'offers', column: 'contact_id' },
    { table: 'task_contacts', column: 'contact_id' },
    { table: 'consultations', column: 'contact_id' },
  ];
  for (const { table, column } of transferTables) {
    const { error } = await supabase.from(table)
      .update({ [column]: primaryContactId }).eq(column, secondaryContactId);
    if (error) console.error(`[merge-contacts] transfer ${table}:`, error);
  }

  await supabase.from('audit_log')
    .update({ entity_id: primaryContactId })
    .eq('entity_type', 'contact').eq('entity_id', secondaryContactId);

  const additionalTables = ['consultation_guests', 'consultation_meetings', 'consultation_recommendations', 'consultation_thanks', 'agent_conversations'];
  for (const table of additionalTables) {
    const { error } = await supabase.from(table)
      .update({ contact_id: primaryContactId }).eq('contact_id', secondaryContactId);
    if (error) console.error(`[merge-contacts] transfer ${table}:`, error);
  }

  await supabase.from('connections')
    .update({ contact_a_id: primaryContactId }).eq('contact_a_id', secondaryContactId);
  await supabase.from('connections')
    .update({ contact_b_id: primaryContactId }).eq('contact_b_id', secondaryContactId);

  // Soft-delete secondary
  const { error: deleteError } = await supabase
    .from('contacts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', secondaryContactId);
  if (deleteError) throw deleteError;

  await supabase.from('audit_log').insert({
    tenant_id: tenantId, entity_type: 'contact', entity_id: primaryContactId,
    actor_id: null, action: 'merge', diff: {},
    metadata: {
      merged_contact_data: { secondary_contact_id: secondaryContactId, merged_fields: sanitizedFields },
      merge_source: 'bulk_merge',
    }
  });
  await supabase.from('audit_log').insert({
    tenant_id: tenantId, entity_type: 'contact', entity_id: primaryContactId,
    actor_id: null, action: 'bulk_merged', diff: {},
    metadata: {
      description: `Kontakt scalony z: ${secondaryName}. Powiązane rekordy przeniesione.`,
      secondary_contact_id: secondaryContactId,
      secondary_contact_name: secondaryName,
      fields_updated: Object.keys(sanitizedFields).filter(k => k !== 'updated_at'),
    }
  });

  return { ok: true, primaryContactId, secondaryContactId };
}

// =================== HANDLER ===================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) return unauthorizedResponse(authResult, corsHeaders);
    const { tenantId } = authResult;

    const rawBody = await req.json().catch(() => ({}));

    // Shape #3: pairs[]
    if (Array.isArray(rawBody?.pairs)) {
      const results: Array<Record<string, unknown>> = [];
      for (const pair of rawBody.pairs as Array<{ target_id: string; source_ids: string[]; merged_fields?: Record<string, any> }>) {
        for (const sourceId of pair.source_ids ?? []) {
          try {
            const r = await mergePairContacts(supabase, tenantId, pair.target_id, sourceId, pair.merged_fields ?? {});
            results.push({ target_id: pair.target_id, source_id: sourceId, ok: r.ok, ...r });
          } catch (e) {
            results.push({ target_id: pair.target_id, source_id: sourceId, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Shape #2: primary + secondary
    if (rawBody?.primaryContactId && rawBody?.secondaryContactId) {
      const r = await mergePairContacts(
        supabase, tenantId,
        rawBody.primaryContactId, rawBody.secondaryContactId,
        rawBody.mergedFields ?? {},
      );
      if (!r.ok) {
        return new Response(JSON.stringify({ error: r.error }), {
          status: r.status ?? 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: true, ...r }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Shape #1: business-card merge
    if (rawBody?.existingContactId) {
      const hasAccess = await verifyResourceAccess(supabase, 'contacts', rawBody.existingContactId, tenantId);
      if (!hasAccess) return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
      const r = await mergeBusinessCardData(supabase, tenantId, rawBody.existingContactId, rawBody.newContactData ?? {});
      if (!r.ok) {
        return new Response(JSON.stringify({ error: r.error }), {
          status: r.status ?? 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: true, ...r }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid body. Expected one of: { existingContactId, newContactData } | { primaryContactId, secondaryContactId, mergedFields } | { pairs: [...] }'
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[merge-contacts] error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

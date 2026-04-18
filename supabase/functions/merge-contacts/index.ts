import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Detect if a Polish phone number is mobile.
 * Mobile prefixes after +48: 5xx, 6xx, 7xx, 8xx
 * Landline prefixes after +48: 1x, 2x, 3x, 4x (city area codes)
 */
function isMobileNumber(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  // Match +48 followed by 5/6/7/8
  if (/^\+48[5-8]\d{8}$/.test(digits)) return true;
  // Without +48 prefix, 9-digit starting with 5/6/7/8
  if (/^[5-8]\d{8}$/.test(digits)) return true;
  return false;
}

function isLandlineNumber(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  if (/^\+48[1-4]\d+$/.test(digits)) return true;
  if (/^[1-4]\d+$/.test(digits) && digits.length >= 7) return true;
  return false;
}

interface MergeRequest {
  existingContactId: string;
  newContactData: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============= AUTHORIZATION CHECK =============
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;
    // ============= END AUTHORIZATION CHECK =============

    const { existingContactId, newContactData } = await req.json() as MergeRequest;

    if (!existingContactId) {
      return new Response(JSON.stringify({ error: 'existingContactId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', existingContactId, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    console.log(`Merging contact ${existingContactId} in tenant ${tenantId}`);

    const { data: existingContact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', existingContactId)
      .single();

    if (fetchError || !existingContact) {
      return new Response(JSON.stringify({ error: 'Existing contact not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const mergedData: Record<string, any> = {};
    
    // ============= IMPROVED MERGE LOGIC =============
    // Priority rules:
    // 1. Private phone - NEVER overwrite
    // 2. Business phone - add if empty
    // 3. Email - add secondary if different
    // 4. Address - add secondary if different
    // 5. Company, position - update only if empty

    // Fields that should only be filled if empty (not overwritten)
    const simpleFields = ['company', 'position', 'city', 'linkedin_url', 'source', 'primary_group_id', 'business_card_image_url'];

    for (const field of simpleFields) {
      if (!existingContact[field] && newContactData[field]) {
        mergedData[field] = newContactData[field];
      }
    }

    // ============= SMART PHONE HANDLING =============
    // phone = numer prywatny/komórkowy (priorytet)
    // phone_business = numer służbowy/stacjonarny
    
    const existingPhone = existingContact.phone;
    const existingPhoneBusiness = existingContact.phone_business;
    const newPhone = newContactData.phone;
    const newPhoneBusiness = newContactData.phone_business;

    if (newPhone) {
      if (!existingPhone) {
        // No existing phone - set it
        mergedData.phone = newPhone;
        console.log(`Setting phone to: ${newPhone}`);
      } else if (existingPhone !== newPhone) {
        // Existing phone differs from new phone
        const existingIsMobile = isMobileNumber(existingPhone);
        const newIsMobile = isMobileNumber(newPhone);
        const existingIsLandline = isLandlineNumber(existingPhone);

        if (existingIsLandline && newIsMobile) {
          // SWAP: move landline to phone_business, set mobile as phone
          console.log(`Smart swap: existing landline ${existingPhone} -> phone_business, new mobile ${newPhone} -> phone`);
          mergedData.phone = newPhone;
          if (!existingPhoneBusiness) {
            mergedData.phone_business = existingPhone;
          }
        } else if (!existingIsMobile && newIsMobile && !existingPhoneBusiness) {
          // Existing is unknown type, new is mobile - swap if phone_business empty
          console.log(`Moving unknown ${existingPhone} to phone_business, setting mobile ${newPhone} as phone`);
          mergedData.phone = newPhone;
          mergedData.phone_business = existingPhone;
        }
      }
    }

    // Fill phone_business if empty on existing contact
    if (newPhoneBusiness && !existingPhoneBusiness && !mergedData.phone_business) {
      mergedData.phone_business = newPhoneBusiness;
      console.log(`Setting phone_business to: ${newPhoneBusiness}`);
    }

    // ============= EMAIL HANDLING =============
    // If new email is different and email_secondary is empty, add as secondary
    if (newContactData.email) {
      const newEmail = newContactData.email.toLowerCase().trim();
      const existingEmail = existingContact.email?.toLowerCase().trim();
      
      if (!existingEmail) {
        // No existing email - add as primary
        mergedData.email = newContactData.email;
      } else if (newEmail !== existingEmail && !existingContact.email_secondary) {
        // Different email and no secondary - add as secondary
        mergedData.email_secondary = newContactData.email;
        console.log(`Adding secondary email: ${newContactData.email}`);
      }
    }

    // ============= ADDRESS HANDLING =============
    // If new address is different and address_secondary is empty, add as secondary
    if (newContactData.address) {
      const newAddress = newContactData.address.trim();
      const existingAddress = existingContact.address?.trim();
      
      if (!existingAddress) {
        // No existing address - add as primary
        mergedData.address = newContactData.address;
      } else if (newAddress !== existingAddress && !existingContact.address_secondary) {
        // Different address and no secondary - add as secondary
        mergedData.address_secondary = newContactData.address;
        console.log(`Adding secondary address: ${newContactData.address}`);
      }
    }

    // ============= COMPANY HANDLING =============
    // If contact has no company_id but has company name (from merge or existing), create/find company
    let companyCreated = false;
    let companyId = existingContact.company_id || newContactData.company_id;
    const companyName = newContactData.company || existingContact.company;
    
    if (!companyId && companyName) {
      console.log(`Contact has no company_id but has company name: ${companyName}. Searching/creating company...`);
      
      // Try to find existing company by name
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .ilike('name', companyName)
        .maybeSingle();
      
      if (existingCompany) {
        console.log(`Found existing company: ${existingCompany.name} (${existingCompany.id})`);
        companyId = existingCompany.id;
      } else {
        // Create new company with basic data from business card
        console.log(`Company not found, creating new company: ${companyName}`);
        
        // Extract data for company
        const companyCity = newContactData.city || existingContact.city || null;
        const email = newContactData.email || existingContact.email;
        let companyWebsite = null;
        
        // Try to extract website from email domain
        if (email) {
          const parts = email.split('@');
          if (parts.length === 2) {
            const domain = parts[1].toLowerCase();
            const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl', 'hotmail.com', 'icloud.com', 'live.com', 'me.com', 'protonmail.com', 'tutanota.com'];
            if (!publicDomains.includes(domain)) {
              companyWebsite = `https://${domain}`;
            }
          }
        }
        
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            tenant_id: tenantId,
            name: companyName,
            city: companyCity,
            website: companyWebsite,
          })
          .select('id')
          .single();
        
        if (companyError) {
          console.error('Failed to create company:', companyError);
        } else if (newCompany) {
          companyId = newCompany.id;
          companyCreated = true;
          console.log(`Created new company with ID: ${companyId}`);
        }
      }
      
      // Update contact with company_id
      if (companyId) {
        mergedData.company_id = companyId;
      }
    }
    // ============= END COMPANY HANDLING =============

    // Merge tags
    const existingTags = new Set(existingContact.tags || []);
    const newTags = new Set(newContactData.tags || []);
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
    if (JSON.stringify(mergedTags) !== JSON.stringify(existingContact.tags || [])) {
      mergedData.tags = mergedTags;
    }

    // Merge notes
    if (newContactData.notes && existingContact.notes !== newContactData.notes) {
      if (!existingContact.notes) {
        mergedData.notes = newContactData.notes;
      } else {
        mergedData.notes = `${existingContact.notes}\n\n---\n\n${newContactData.notes}`;
      }
    }

    if (Object.keys(mergedData).length > 0) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ ...mergedData, updated_at: new Date().toISOString() })
        .eq('id', existingContactId);

      if (updateError) throw updateError;

      await supabase.from('audit_log').insert({
        tenant_id: tenantId,
        entity_type: 'contact',
        entity_id: existingContactId,
        actor_id: null,
        action: 'merge',
        diff: {},
        metadata: {
          merged_contact_data: newContactData,
          merge_source: 'manual',
        }
      });

      // Log merge activity
      await supabase.from('audit_log').insert({
        tenant_id: tenantId,
        entity_type: 'contact',
        entity_id: existingContactId,
        actor_id: null,
        action: 'merged',
        diff: {},
        metadata: {
          description: companyCreated
            ? `Kontakt scalony z danymi wizytówki. Utworzono firmę: ${companyName}`
            : 'Kontakt został scalony z innymi danymi',
          fields_updated: Object.keys(mergedData),
          source: 'manual',
          company_created: companyCreated,
          company_id: companyId
        }
      });
    }

    const { data: updatedContact } = await supabase.from('contacts').select('*').eq('id', existingContactId).single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        contact: updatedContact, 
        merged: true, 
        fieldsUpdated: Object.keys(mergedData),
        companyCreated,
        companyId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

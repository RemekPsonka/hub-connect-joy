import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tenant_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contact } = await req.json() as { contact: ContactData };

    if (!contact.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contact.first_name || !contact.last_name) {
      return new Response(
        JSON.stringify({ isDuplicate: false, existingContact: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Wywołaj funkcję SQL do wyszukania duplikatu
    const { data: duplicates, error } = await supabase.rpc('find_duplicate_contact', {
      p_tenant_id: contact.tenant_id,
      p_first_name: contact.first_name,
      p_last_name: contact.last_name,
      p_email: contact.email || null,
      p_phone: contact.phone || null,
    });

    if (error) {
      console.error('Error checking duplicate:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (duplicates && duplicates.length > 0) {
      const dup = duplicates[0];
      const existingContact = {
        id: dup.contact_id,
        first_name: dup.contact_first_name,
        last_name: dup.contact_last_name,
        full_name: dup.contact_full_name,
        email: dup.contact_email,
        phone: dup.contact_phone,
        company: dup.contact_company,
        position: dup.contact_position,
        city: dup.contact_city,
        notes: dup.contact_notes,
        profile_summary: dup.contact_profile_summary,
        tags: dup.contact_tags,
        primary_group_id: dup.contact_primary_group_id,
        linkedin_url: dup.contact_linkedin_url,
        source: dup.contact_source,
      };

      console.log('Duplicate found:', existingContact.id);

      return new Response(
        JSON.stringify({ isDuplicate: true, existingContact }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ isDuplicate: false, existingContact: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in check-duplicate-contact:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

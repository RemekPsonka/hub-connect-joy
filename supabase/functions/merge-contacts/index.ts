import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactData {
  id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  city?: string;
  notes?: string;
  profile_summary?: string;
  tags?: string[];
  primary_group_id?: string;
  linkedin_url?: string;
  source?: string;
  tenant_id?: string;
  company_id?: string;
}

interface MergeRequest {
  existingContactId: string;
  newContactData: ContactData;
  tenant_id: string;
}

async function integrateDescriptions(existing: string | null, newDesc: string | null, apiKey: string): Promise<string> {
  if (!existing && !newDesc) return '';
  if (!existing) return newDesc || '';
  if (!newDesc) return existing;
  
  // Jeśli oba opisy są identyczne, zwróć jeden
  if (existing.trim() === newDesc.trim()) return existing;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Jesteś asystentem integrującym opisy kontaktów. Twoim zadaniem jest połączenie dwóch opisów tej samej osoby w jeden spójny, wyczerpujący tekst. 
Zasady:
- Usuń powtórzenia
- Zachowaj wszystkie unikalne informacje z obu źródeł
- Zachowaj chronologię jeśli to możliwe
- Pisz w języku polskim
- Zwróć TYLKO zintegrowany opis, bez komentarzy`
          },
          {
            role: 'user',
            content: `Zintegruj te dwa opisy tej samej osoby:\n\nOPIS 1:\n${existing}\n\nOPIS 2:\n${newDesc}`
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('AI integration failed:', response.status);
      // Fallback: połącz opisy manualnie
      return `${existing}\n\n---\n\n${newDesc}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || `${existing}\n\n---\n\n${newDesc}`;
  } catch (error) {
    console.error('Error integrating descriptions:', error);
    return `${existing}\n\n---\n\n${newDesc}`;
  }
}

function mergeTags(existing: string[] | null | undefined, newTags: string[] | null | undefined): string[] {
  const existingSet = new Set(existing || []);
  const newSet = new Set(newTags || []);
  return Array.from(new Set([...existingSet, ...newSet]));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { existingContactId, newContactData, tenant_id } = await req.json() as MergeRequest;

    console.log('Merging contact:', existingContactId, 'with new data');

    // Pobierz istniejący kontakt
    const { data: existingContact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', existingContactId)
      .single();

    if (fetchError || !existingContact) {
      return new Response(
        JSON.stringify({ error: 'Existing contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiIntegratedFields: string[] = [];

    // Przygotuj dane do scalenia - uzupełnij puste pola
    const mergedData: Record<string, string | string[] | null | undefined> = {};

    // Pola do prostego uzupełnienia (jeśli istniejące jest puste)
    const simpleFields = [
      'email', 'phone', 'company', 'position', 'city', 
      'linkedin_url', 'source', 'primary_group_id', 'company_id'
    ] as const;

    for (const field of simpleFields) {
      if (!existingContact[field] && newContactData[field]) {
        mergedData[field] = newContactData[field] as string;
      }
    }

    // Scalanie tagów
    const mergedTags = mergeTags(existingContact.tags, newContactData.tags);
    if (JSON.stringify(mergedTags) !== JSON.stringify(existingContact.tags || [])) {
      mergedData.tags = mergedTags;
    }

    // Integracja notes przez AI
    if (newContactData.notes && existingContact.notes !== newContactData.notes) {
      if (lovableApiKey) {
        const integratedNotes = await integrateDescriptions(
          existingContact.notes,
          newContactData.notes,
          lovableApiKey
        );
        if (integratedNotes !== existingContact.notes) {
          mergedData.notes = integratedNotes;
          aiIntegratedFields.push('notes');
        }
      } else if (!existingContact.notes) {
        mergedData.notes = newContactData.notes;
      }
    }

    // Integracja profile_summary przez AI
    if (newContactData.profile_summary && existingContact.profile_summary !== newContactData.profile_summary) {
      if (lovableApiKey) {
        const integratedSummary = await integrateDescriptions(
          existingContact.profile_summary,
          newContactData.profile_summary,
          lovableApiKey
        );
        if (integratedSummary !== existingContact.profile_summary) {
          mergedData.profile_summary = integratedSummary;
          aiIntegratedFields.push('profile_summary');
        }
      } else if (!existingContact.profile_summary) {
        mergedData.profile_summary = newContactData.profile_summary;
      }
    }

    // Aktualizuj kontakt jeśli są zmiany
    if (Object.keys(mergedData).length > 0) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          ...mergedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContactId);

      if (updateError) {
        console.error('Error updating contact:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Zapisz historię scalenia
      await supabase
        .from('contact_merge_history')
        .insert({
          tenant_id,
          primary_contact_id: existingContactId,
          merged_contact_data: newContactData,
          ai_integrated_fields: aiIntegratedFields.length > 0 ? aiIntegratedFields : null,
          merge_source: 'manual',
        });

      console.log('Contact merged successfully:', existingContactId);
    }

    // Pobierz zaktualizowany kontakt
    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', existingContactId)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        contact: updatedContact,
        merged: true,
        fieldsUpdated: Object.keys(mergedData),
        aiIntegratedFields,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in merge-contacts:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

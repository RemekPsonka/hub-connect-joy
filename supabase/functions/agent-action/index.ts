import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentAction {
  type: 'CREATE_TASK' | 'ADD_NOTE' | 'UPDATE_PROFILE' | 'ADD_INSIGHT' | 'CREATE_NEED' | 'CREATE_OFFER' | 'SCHEDULE_FOLLOWUP';
  data: Record<string, any>;
  reason?: string;
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

    const { contact_id, action, session_id } = await req.json() as {
      contact_id: string;
      action: AgentAction;
      session_id?: string;
    };

    if (!contact_id || !action) {
      return new Response(
        JSON.stringify({ error: 'contact_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', contact_id, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    // Fetch contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('tenant_id, full_name, notes')
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: any = { success: false };

    console.log(`Executing agent action: ${action.type} for contact ${contact_id} in tenant ${tenantId}`);

    switch (action.type) {
      case 'CREATE_TASK': {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            tenant_id: tenantId,
            title: action.data.title,
            description: action.data.description || action.reason,
            priority: action.data.priority || 'medium',
            due_date: action.data.due_date || null,
            status: 'pending',
            task_type: 'follow_up'
          })
          .select()
          .single();

        if (taskError) throw taskError;

        await supabase.from('task_contacts').insert({
          task_id: task.id,
          contact_id,
          role: 'primary'
        });

        result = { success: true, type: 'task', data: task };
        break;
      }

      case 'ADD_NOTE': {
        const currentNotes = contact.notes || '';
        const timestamp = new Date().toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const newNote = `\n\n---\n📝 Agent AI (${timestamp}):\n${action.data.text || action.data.content}`;
        
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ 
            notes: currentNotes + newNote,
            updated_at: new Date().toISOString()
          })
          .eq('id', contact_id);

        if (updateError) throw updateError;

        result = { success: true, type: 'note', data: { added_note: newNote } };
        break;
      }

      case 'UPDATE_PROFILE': {
        const allowedFields = ['position', 'phone', 'email', 'city', 'linkedin_url', 'company'];
        const field = action.data.field;
        
        if (!allowedFields.includes(field)) {
          throw new Error(`Field ${field} is not allowed to be updated`);
        }

        const { error: updateError } = await supabase
          .from('contacts')
          .update({ 
            [field]: action.data.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', contact_id);

        if (updateError) throw updateError;

        result = { success: true, type: 'profile_update', data: { field, value: action.data.value } };
        break;
      }

      case 'CREATE_NEED': {
        const { data: need, error: needError } = await supabase
          .from('needs')
          .insert({
            tenant_id: tenantId,
            contact_id,
            title: action.data.title,
            description: action.data.description,
            priority: action.data.priority || 'medium',
            status: 'active'
          })
          .select()
          .single();

        if (needError) throw needError;

        result = { success: true, type: 'need', data: need };
        break;
      }

      case 'CREATE_OFFER': {
        const { data: offer, error: offerError } = await supabase
          .from('offers')
          .insert({
            tenant_id: tenantId,
            contact_id,
            title: action.data.title,
            description: action.data.description,
            status: 'active'
          })
          .select()
          .single();

        if (offerError) throw offerError;

        result = { success: true, type: 'offer', data: offer };
        break;
      }

      case 'SCHEDULE_FOLLOWUP': {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            tenant_id: tenantId,
            title: `Follow-up: ${contact.full_name}`,
            description: action.data.reason || action.reason || 'Follow-up zaplanowany przez Agent AI',
            priority: 'medium',
            due_date: action.data.date || action.data.due_date,
            status: 'pending',
            task_type: 'follow_up'
          })
          .select()
          .single();

        if (taskError) throw taskError;

        await supabase.from('task_contacts').insert({
          task_id: task.id,
          contact_id,
          role: 'primary'
        });

        result = { success: true, type: 'followup', data: task };
        break;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    console.log(`Action ${action.type} completed successfully`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent action error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

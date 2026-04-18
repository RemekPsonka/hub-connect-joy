import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rateLimit-upstash-rest.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Sprint 01 — auth + rate-limit (10/h)
  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  const rl = await checkRateLimit(auth.user.id, "batch-krs-sync", 10, 3600);
  if (!rl.ok) return rateLimitedResponse(corsHeaders);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is OK
  }

  const batchSize = body.batch_size || 10;
  const startFromId = body.start_from_id || null;
  const skipErrors = body.skip_errors !== false; // Default: skip errors

  console.log(`[Batch KRS] Starting batch sync. Size: ${batchSize}, Resume from: ${startFromId || 'beginning'}`);

  try {
    // Get pending companies (status pending or null, excluding completed and error if skipErrors)
    let query = supabase
      .from('companies')
      .select('id, name, krs, nip, website')
      .or('source_data_status.eq.pending,source_data_status.is.null')
      .order('name', { ascending: true })
      .limit(batchSize);

    if (startFromId) {
      query = query.gt('id', startFromId);
    }

    const { data: companies, error } = await query;
    if (error) {
      console.error('[Batch KRS] Query error:', error);
      throw error;
    }

    if (!companies || companies.length === 0) {
      // Count total and completed for final stats
      const { count: totalCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const { count: completedCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('source_data_status', 'completed');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Wszystkie firmy zostały przetworzone!',
          processed: 0,
          remaining: 0,
          total: totalCount || 0,
          completed: completedCount || 0,
          done: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Batch KRS] Found ${companies.length} companies to process`);

    const results: Array<{
      id: string;
      name: string;
      status: string;
      krs?: string | null;
      nip?: string | null;
      error?: string;
    }> = [];
    let lastProcessedId: string | null = null;

    for (const company of companies) {
      try {
        console.log(`[Batch KRS] Processing: ${company.name} (${company.id})`);
        
        // Mark as in_progress
        await supabase
          .from('companies')
          .update({ source_data_status: 'in_progress' })
          .eq('id', company.id);

        // Call verify-company-source for this company
        const response = await fetch(`${supabaseUrl}/functions/v1/verify-company-source`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            company_id: company.id,
            company_name: company.name,
            existing_krs: company.krs,
            existing_nip: company.nip,
            website: company.website,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Batch KRS] Error for ${company.name}:`, errorText);
          
          // Mark as error but continue
          await supabase
            .from('companies')
            .update({ 
              source_data_status: 'error',
              source_data_date: new Date().toISOString()
            })
            .eq('id', company.id);
          
          results.push({ 
            id: company.id, 
            name: company.name, 
            status: 'error', 
            error: errorText.substring(0, 200) 
          });
        } else {
          const data = await response.json();
          console.log(`[Batch KRS] Completed ${company.name}:`, data?.has_krs ? 'KRS found' : 'No KRS');
          
          results.push({ 
            id: company.id, 
            name: company.name, 
            status: 'completed',
            krs: data?.krs || null,
            nip: data?.nip || null
          });
        }

        lastProcessedId = company.id;

        // Delay between requests to avoid rate limiting
        // KRS API and Perplexity have rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (e: any) {
        console.error(`[Batch KRS] Exception for ${company.name}:`, e);
        
        // Mark as error
        await supabase
          .from('companies')
          .update({ 
            source_data_status: 'error',
            source_data_date: new Date().toISOString()
          })
          .eq('id', company.id);

        results.push({ 
          id: company.id, 
          name: company.name, 
          status: 'exception', 
          error: e.message || 'Unknown error' 
        });
        
        lastProcessedId = company.id;
        // Continue to next company
      }
    }

    // Count remaining
    const { count: remainingCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .or('source_data_status.eq.pending,source_data_status.is.null');

    const { count: totalCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const { count: completedCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('source_data_status', 'completed');

    const { count: errorCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('source_data_status', 'error');

    console.log(`[Batch KRS] Batch complete. Processed: ${results.length}, Remaining: ${remainingCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        remaining: remainingCount || 0,
        total: totalCount || 0,
        completed: completedCount || 0,
        errors: errorCount || 0,
        last_processed_id: lastProcessedId,
        done: (remainingCount || 0) === 0,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Batch KRS] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown fatal error',
        done: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

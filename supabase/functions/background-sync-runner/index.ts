import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "zod";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod schema for request validation
const requestSchema = z.object({
  job_id: z.string().uuid("job_id musi być poprawnym UUID"),
  tenant_id: z.string().uuid("tenant_id musi być poprawnym UUID"),
  batch_size: z.number().int().min(1).max(100).optional().default(10),
  skip_errors: z.boolean().optional().default(true),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Zod validation
    const body = await req.json().catch(() => ({}));
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { job_id, tenant_id, batch_size, skip_errors } = validation.data;

    // Get current job status
    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'paused') {
      return new Response(
        JSON.stringify({ success: true, message: 'Job is paused', progress: job.progress }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'completed') {
      return new Response(
        JSON.stringify({ success: true, message: 'Job already completed', progress: job.progress }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const progress = job.progress || { processed: 0, total: 0, errors: 0, last_id: null };
    const logs: any[] = job.logs || [];

    // Get pending companies
    let query = supabase
      .from('companies')
      .select('id, name, krs, nip, website')
      .eq('tenant_id', tenant_id)
      .or('source_data_status.eq.pending,source_data_status.is.null')
      .order('name', { ascending: true })
      .limit(batch_size);

    if (progress.last_id) {
      query = query.gt('id', progress.last_id);
    }

    const { data: companies, error: companiesError } = await query;

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }

    if (!companies || companies.length === 0) {
      // Job completed
      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress: { ...progress, processed: progress.total },
          logs: [...logs, { 
            timestamp: new Date().toISOString(), 
            message: 'Wszystkie firmy zweryfikowane!', 
            type: 'success' 
          }]
        })
        .eq('id', job_id);

      return new Response(
        JSON.stringify({ success: true, completed: true, progress }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If this is first batch, get total count
    if (progress.total === 0) {
      const { count } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .or('source_data_status.eq.pending,source_data_status.is.null');

      progress.total = count || 0;
    }

    let processedCount = 0;
    let errorsCount = 0;
    let lastProcessedId = progress.last_id;

    for (const company of companies) {
      // Check if job was paused
      const { data: currentJob } = await supabase
        .from('sync_jobs')
        .select('status')
        .eq('id', job_id)
        .single();

      if (currentJob?.status === 'paused') {
        logs.push({
          timestamp: new Date().toISOString(),
          message: 'Synchronizacja wstrzymana przez użytkownika',
          type: 'warning'
        });
        break;
      }

      try {
        console.log(`[Sync] Processing: ${company.name} (${company.id})`);

        // Mark as in progress
        await supabase
          .from('companies')
          .update({ source_data_status: 'in_progress' })
          .eq('id', company.id);

        // Call verify-company-source
        const response = await fetch(`${supabaseUrl}/functions/v1/verify-company-source`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            company_id: company.id,
            company_name: company.name,
            existing_krs: company.krs,
            existing_nip: company.nip,
            website: company.website
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          console.error(`[Sync] Error for ${company.name}:`, result);
          
          await supabase
            .from('companies')
            .update({ 
              source_data_status: 'error',
              source_data_date: new Date().toISOString()
            })
            .eq('id', company.id);

          logs.push({
            timestamp: new Date().toISOString(),
            message: `❌ ${company.name}: ${result.error || 'Błąd weryfikacji'}`,
            type: 'error'
          });

          errorsCount++;
        } else {
          logs.push({
            timestamp: new Date().toISOString(),
            message: `✓ ${company.name}${result.has_krs ? ' (KRS)' : ''}${result.has_nip ? ' (NIP)' : ''}`,
            type: 'success'
          });

          processedCount++;
        }

        lastProcessedId = company.id;

        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if we're approaching timeout (50s limit)
        if (Date.now() - startTime > 50000) {
          console.log('[Sync] Approaching timeout, will self-invoke');
          break;
        }

      } catch (e: any) {
        console.error(`[Sync] Exception for ${company.name}:`, e);
        
        await supabase
          .from('companies')
          .update({ 
            source_data_status: 'error',
            source_data_date: new Date().toISOString()
          })
          .eq('id', company.id);

        logs.push({
          timestamp: new Date().toISOString(),
          message: `❌ ${company.name}: ${e.message}`,
          type: 'error'
        });

        errorsCount++;
        lastProcessedId = company.id;
      }
    }

    // Update progress
    const newProgress = {
      processed: progress.processed + processedCount,
      total: progress.total,
      errors: progress.errors + errorsCount,
      last_id: lastProcessedId
    };

    // Check remaining
    const { count: remainingCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .or('source_data_status.eq.pending,source_data_status.is.null');

    const isCompleted = (remainingCount || 0) === 0;

    // Get current job status again
    const { data: finalJobStatus } = await supabase
      .from('sync_jobs')
      .select('status')
      .eq('id', job_id)
      .single();

    const finalStatus = isCompleted ? 'completed' : (finalJobStatus?.status === 'paused' ? 'paused' : 'running');

    await supabase
      .from('sync_jobs')
      .update({
        status: finalStatus,
        completed_at: isCompleted ? new Date().toISOString() : null,
        progress: newProgress,
        logs: logs.slice(-200) // Keep last 200 logs
      })
      .eq('id', job_id);

    // If not completed and still running, self-invoke to continue
    if (!isCompleted && finalStatus === 'running') {
      fetch(`${supabaseUrl}/functions/v1/background-sync-runner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ job_id, tenant_id, batch_size, skip_errors })
      }).catch(e => console.error('Self-invoke error:', e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        completed: isCompleted,
        progress: newProgress,
        remaining: remainingCount || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

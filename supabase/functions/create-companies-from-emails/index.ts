import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Public email domains to skip
const PUBLIC_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.pl', 'yahoo.co.uk',
  'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 'gazeta.pl', 'poczta.fm',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me',
  'mail.com', 'email.com', 'yandex.com', 'yandex.ru',
  'tlen.pl', 'op.pl', 'vp.pl', 'autograf.pl', 'buziaczek.pl',
  'go2.pl', 'pino.pl', 'spoko.pl', 'prokonto.pl',
  'tutanota.com', 'gmx.com', 'gmx.net', 'zoho.com'
];

function extractDomain(email: string | null): string | null {
  if (!email) return null;
  const match = email.toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/i);
  if (!match) return null;
  const domain = match[1];
  if (PUBLIC_DOMAINS.includes(domain)) return null;
  return domain;
}

function normalizeDomain(domain: string): string {
  // Remove www. prefix if present
  return domain.replace(/^www\./, '').toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { job_id, tenant_id, batch_size = 50 } = body;

    if (!job_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'job_id and tenant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (job.status === 'paused' || job.status === 'completed') {
      return new Response(
        JSON.stringify({ success: true, message: `Job is ${job.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const progress = job.progress || { processed: 0, total: 0, errors: 0, companies_created: 0, last_id: null };
    const logs: any[] = job.logs || [];

    // Get contacts without company_id that have business emails AND haven't been verified yet
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, email, company, first_name, last_name')
      .eq('tenant_id', tenant_id)
      .is('company_id', null)
      .is('company_verified_at', null)  // Skip already processed contacts (including public emails)
      .eq('is_active', true)
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      throw contactsError;
    }

    if (!contacts || contacts.length === 0) {
      // Job completed
      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress: { ...progress, processed: progress.total },
          logs: [...logs, { 
            timestamp: new Date().toISOString(), 
            message: 'Wszystkie kontakty przetworzone!', 
            type: 'success' 
          }]
        })
        .eq('id', job_id);

      return new Response(
        JSON.stringify({ success: true, completed: true, progress }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If this is first batch, get total count of contacts that need processing
    if (progress.total === 0) {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .is('company_id', null)
        .is('company_verified_at', null)  // Only count unverified contacts
        .eq('is_active', true)
        .not('email', 'is', null);

      progress.total = count || 0;
    }

    // Get existing companies by website domain for matching
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('id, website, name')
      .eq('tenant_id', tenant_id);

    // Build domain to company map
    const domainToCompany = new Map<string, { id: string; name: string }>();
    for (const company of existingCompanies || []) {
      if (company.website) {
        try {
          const url = new URL(company.website.startsWith('http') ? company.website : `https://${company.website}`);
          const domain = normalizeDomain(url.hostname);
          domainToCompany.set(domain, { id: company.id, name: company.name });
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }

    let processedCount = 0;
    let errorsCount = 0;
    let companiesCreated = 0;

    for (const contact of contacts) {
      try {
        const domain = extractDomain(contact.email);
        
        if (!domain) {
          // Public email, mark as processed but skip
          await supabase
            .from('contacts')
            .update({ company_verified_at: new Date().toISOString() })
            .eq('id', contact.id);
          
          processedCount++;
          continue;
        }

        const normalizedDomain = normalizeDomain(domain);
        let companyId: string;
        let companyName: string;

        // Check if company with this domain already exists
        const existingCompany = domainToCompany.get(normalizedDomain);

        if (existingCompany) {
          companyId = existingCompany.id;
          companyName = existingCompany.name;
        } else {
          // Create new company
          const newCompanyName = contact.company || domain.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' ');
          
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({
              tenant_id,
              name: newCompanyName.charAt(0).toUpperCase() + newCompanyName.slice(1),
              website: `https://${domain}`,
              source_data_status: 'pending'
            })
            .select('id, name')
            .single();

          if (createError) {
            console.error(`Error creating company for ${domain}:`, createError);
            errorsCount++;
            continue;
          }

          companyId = newCompany.id;
          companyName = newCompany.name;
          companiesCreated++;

          // Add to map for future contacts in this batch
          domainToCompany.set(normalizedDomain, { id: companyId, name: companyName });

          logs.push({
            timestamp: new Date().toISOString(),
            message: `Utworzono firmę: ${companyName} (${domain})`,
            type: 'success'
          });
        }

        // Assign contact to company
        await supabase
          .from('contacts')
          .update({
            company_id: companyId,
            company_verified_at: new Date().toISOString()
          })
          .eq('id', contact.id);

        processedCount++;

        // Check if we're approaching timeout (50s limit)
        if (Date.now() - startTime > 50000) {
          break;
        }

      } catch (e: any) {
        console.error(`Error processing contact ${contact.id}:`, e);
        errorsCount++;
      }
    }

    // Update progress
    const newProgress = {
      processed: progress.processed + processedCount,
      total: progress.total,
      errors: progress.errors + errorsCount,
      companies_created: (progress.companies_created || 0) + companiesCreated,
      last_id: contacts[contacts.length - 1]?.id
    };

    // Check if more contacts to process (only unverified ones)
    const { count: remainingCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .is('company_id', null)
      .is('company_verified_at', null)  // Only count unverified contacts
      .eq('is_active', true)
      .not('email', 'is', null);

    const isCompleted = (remainingCount || 0) === 0;

    await supabase
      .from('sync_jobs')
      .update({
        status: isCompleted ? 'completed' : 'running',
        completed_at: isCompleted ? new Date().toISOString() : null,
        progress: newProgress,
        logs: logs.slice(-100) // Keep last 100 logs
      })
      .eq('id', job_id);

    // If not completed and job still running, self-invoke to continue
    if (!isCompleted && job.status === 'running') {
      // Self-invoke to continue processing
      fetch(`${supabaseUrl}/functions/v1/create-companies-from-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ job_id, tenant_id, batch_size })
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

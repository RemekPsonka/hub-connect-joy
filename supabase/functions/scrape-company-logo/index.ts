import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[scrape-company-logo] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { companyWebsite, companyId } = await req.json();

    if (!companyWebsite) {
      return new Response(
        JSON.stringify({ success: false, error: 'Brak adresu strony WWW' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[scrape-company-logo] Starting for website: ${companyWebsite}, companyId: ${companyId}`);

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    let logoUrl: string | null = null;
    let method = 'unknown';

    // Normalize website URL
    const normalizedUrl = companyWebsite.startsWith('http') 
      ? companyWebsite 
      : `https://${companyWebsite}`;

    // Extract domain for Clearbit fallback
    let domain: string;
    try {
      const urlObj = new URL(normalizedUrl);
      domain = urlObj.hostname.replace('www.', '');
    } catch (e) {
      console.error('[scrape-company-logo] Invalid URL:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Nieprawidłowy adres URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Firecrawl if API key available
    if (firecrawlApiKey) {
      try {
        console.log('[scrape-company-logo] Trying Firecrawl scrape...');
        
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlApiKey}`,
          },
          body: JSON.stringify({
            url: normalizedUrl,
            formats: ['html'],
            onlyMainContent: false,
            timeout: 15000,
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          const pageData = firecrawlData.data || firecrawlData;
          const metadata = pageData.metadata || {};
          const html = pageData.html || '';

          console.log('[scrape-company-logo] Firecrawl success, checking metadata...');

          // METHOD 1: OpenGraph image
          if (metadata.ogImage) {
            logoUrl = metadata.ogImage;
            method = 'og_image';
            console.log('[scrape-company-logo] Found OG image:', logoUrl);
          }

          // METHOD 2: Look for favicon/apple-touch-icon in HTML
          if (!logoUrl && html) {
            // Try apple-touch-icon first (usually higher quality)
            const appleTouchMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
            if (appleTouchMatch) {
              logoUrl = appleTouchMatch[1];
              method = 'apple_touch_icon';
              console.log('[scrape-company-logo] Found apple-touch-icon:', logoUrl);
            }
          }

          // METHOD 3: Look for regular icon/shortcut icon
          if (!logoUrl && html) {
            const iconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i);
            if (iconMatch) {
              logoUrl = iconMatch[2];
              method = 'favicon';
              console.log('[scrape-company-logo] Found favicon:', logoUrl);
            }
          }

          // METHOD 4: Look for <img> with alt containing "logo"
          if (!logoUrl && html) {
            const logoImgMatch = html.match(/<img[^>]*alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
            if (logoImgMatch) {
              logoUrl = logoImgMatch[1];
              method = 'img_logo_alt';
              console.log('[scrape-company-logo] Found img with logo alt:', logoUrl);
            }
          }

          // METHOD 5: Look for <img> with class/id containing "logo"
          if (!logoUrl && html) {
            const logoClassMatch = html.match(/<img[^>]*(class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
            if (logoClassMatch) {
              logoUrl = logoClassMatch[2];
              method = 'img_logo_class';
              console.log('[scrape-company-logo] Found img with logo class/id:', logoUrl);
            }
          }

          // Normalize relative URLs to absolute
          if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
            try {
              const baseUrl = new URL(normalizedUrl);
              if (logoUrl.startsWith('//')) {
                logoUrl = `https:${logoUrl}`;
              } else if (logoUrl.startsWith('/')) {
                logoUrl = `${baseUrl.origin}${logoUrl}`;
              } else {
                logoUrl = new URL(logoUrl, baseUrl.origin).href;
              }
              console.log('[scrape-company-logo] Normalized URL to:', logoUrl);
            } catch (e) {
              console.error('[scrape-company-logo] Failed to normalize URL:', e);
            }
          }
        } else {
          console.warn('[scrape-company-logo] Firecrawl request failed:', firecrawlResponse.status);
        }
      } catch (firecrawlError) {
        console.error('[scrape-company-logo] Firecrawl error:', firecrawlError);
      }
    } else {
      console.log('[scrape-company-logo] No Firecrawl API key, skipping scrape');
    }

    // FALLBACK: Clearbit Logo API
    if (!logoUrl) {
      logoUrl = `https://logo.clearbit.com/${domain}`;
      method = 'clearbit_fallback';
      console.log('[scrape-company-logo] Using Clearbit fallback:', logoUrl);
    }

    // Save to companies table if companyId provided
    if (companyId && logoUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('id', companyId);

      if (updateError) {
        console.error('[scrape-company-logo] Failed to update company:', updateError);
      } else {
        console.log('[scrape-company-logo] Updated company logo_url');
      }
    }

    console.log(`[scrape-company-logo] Done. Method: ${method}, URL: ${logoUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        logo_url: logoUrl,
        method,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[scrape-company-logo] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

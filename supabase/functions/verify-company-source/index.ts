import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// KRS API - Polish National Court Register
async function fetchKRSData(krs: string): Promise<any | null> {
  try {
    // Try P (commercial companies) first, then S (associations)
    for (const register of ['P', 'S']) {
      const url = `https://api-krs.ms.gov.pl/api/krs/OdsijApi/${register}/${krs}`;
      console.log(`[KRS] Trying ${register} register for KRS ${krs}`);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data?.odppierwsza || data?.odpis) {
          console.log(`[KRS] Found in ${register} register`);
          return data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('[KRS] Error fetching:', error);
    return null;
  }
}

// CEIDG API - Polish Sole Proprietorship Register
async function fetchCEIDGData(nip: string, token: string): Promise<any | null> {
  try {
    const url = `https://dane.biznes.gov.pl/api/ceidg/v2/firmy?nip=${nip}`;
    console.log(`[CEIDG] Fetching for NIP ${nip}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.firmy?.[0]) {
        console.log('[CEIDG] Found business');
        return data.firmy[0];
      }
    }
    return null;
  } catch (error) {
    console.error('[CEIDG] Error fetching:', error);
    return null;
  }
}

// Perplexity basic search - find KRS/NIP if unknown
async function searchBasicInfo(
  companyName: string, 
  apiKey: string
): Promise<{ krs?: string; nip?: string; regon?: string; info?: string }> {
  try {
    console.log(`[Perplexity] Basic search for ${companyName}`);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: `Znajdź oficjalne dane rejestrowe polskiej firmy "${companyName}":
- NIP (10 cyfr)
- KRS (10 cyfr, jeśli spółka)
- REGON (9 lub 14 cyfr)
- Forma prawna
- Adres siedziby
- Data rejestracji

Odpowiedz krótko, tylko fakty.`
        }],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error('[Perplexity] API error:', response.status);
      return {};
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    
    // Extract registry IDs
    const nipMatch = content.match(/NIP[:\s]*(\d{10}|\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2})/i);
    const krsMatch = content.match(/KRS[:\s]*(\d{10})/i);
    const regonMatch = content.match(/REGON[:\s]*(\d{9,14})/i);
    
    return {
      nip: nipMatch ? nipMatch[1].replace(/[-\s]/g, '') : undefined,
      krs: krsMatch ? krsMatch[1] : undefined,
      regon: regonMatch ? regonMatch[1] : undefined,
      info: content
    };
  } catch (error) {
    console.error('[Perplexity] Error:', error);
    return {};
  }
}

// Parse KRS response to extract useful data
function parseKRSResponse(krsData: any): any {
  try {
    const odpis = krsData?.odppierwsza || krsData?.odpis;
    if (!odpis) return null;

    const dane = odpis?.dane || {};
    const dzial1 = dane?.dzial1 || {};
    const dzial2 = dane?.dzial2 || {};
    
    // Get name
    const danePodmiotu = dzial1?.danePodmiotu || {};
    const nazwa = danePodmiotu?.nazwa || '';
    
    // Get address
    const siedziba = dzial1?.siedzibaIAdres?.adres || {};
    const address = [
      siedziba?.ulica ? `ul. ${siedziba.ulica}` : null,
      siedziba?.nrDomu,
      siedziba?.nrLokalu ? `/${siedziba.nrLokalu}` : null
    ].filter(Boolean).join(' ');
    
    // Get NIP/REGON
    const identyfikatory = dzial1?.danePodmiotu?.identyfikatory || {};
    
    // Get management
    const management: Array<{name: string; position: string; verified: boolean}> = [];
    
    // Parse Zarząd
    const zarzad = dzial2?.organReprezentacji?.sklad || [];
    if (Array.isArray(zarzad)) {
      zarzad.forEach((osoba: any) => {
        if (osoba?.imiona && osoba?.nazwisko) {
          management.push({
            name: `${osoba.imiona} ${osoba.nazwisko}`,
            position: osoba.funkcja || 'Członek Zarządu',
            verified: true
          });
        }
      });
    }
    
    // Parse Wspólnicy/Udziałowcy
    const wspolnicy = dzial1?.wspolnicyLubAkcjonariusze || [];
    const shareholders: Array<{name: string; shares?: number; verified: boolean}> = [];
    if (Array.isArray(wspolnicy)) {
      wspolnicy.forEach((wspolnik: any) => {
        if (wspolnik?.nazwisko) {
          shareholders.push({
            name: wspolnik.imiona ? `${wspolnik.imiona} ${wspolnik.nazwisko}` : wspolnik.nazwisko,
            shares: wspolnik.posiadaneUdzialy?.iloscUdzialow,
            verified: true
          });
        }
      });
    }

    // Get PKD codes
    const dzial3 = dane?.dzial3 || {};
    const pkd = dzial3?.przedmiotDzialalnosci?.przedmiotPrzewazajacejDzialalnosci || [];
    const pkdCodes = Array.isArray(pkd) ? pkd.map((p: any) => p?.kodDzial || p?.kod).filter(Boolean) : [];

    return {
      name_official: nazwa,
      nip: identyfikatory?.nip || null,
      regon: identyfikatory?.regon || null,
      address: address || null,
      city: siedziba?.miejscowosc || null,
      postal_code: siedziba?.kodPocztowy || null,
      registration_date: danePodmiotu?.dataRozpoczeciaDzialalnosci || null,
      legal_form: danePodmiotu?.formaLubRodzajRejestru || 'spółka',
      pkd_codes: pkdCodes,
      management,
      shareholders,
      source: 'krs_api',
      confidence: 'verified'
    };
  } catch (error) {
    console.error('[KRS] Parse error:', error);
    return null;
  }
}

// Parse CEIDG response
function parseCEIDGResponse(ceidgData: any): any {
  try {
    return {
      name_official: ceidgData?.nazwa || null,
      nip: ceidgData?.wlasciciel?.nip || null,
      regon: ceidgData?.wlasciciel?.regon || null,
      address: ceidgData?.adresDzialalnosci?.ulica || null,
      city: ceidgData?.adresDzialalnosci?.miasto || null,
      postal_code: ceidgData?.adresDzialalnosci?.kodPocztowy || null,
      registration_date: ceidgData?.dataRozpoczeciaDzialalnosci || null,
      legal_form: 'jednoosobowa_dzialalnosc',
      pkd_codes: ceidgData?.pkd ? [ceidgData.pkd] : [],
      management: [{
        name: `${ceidgData?.wlasciciel?.imie || ''} ${ceidgData?.wlasciciel?.nazwisko || ''}`.trim(),
        position: 'Właściciel',
        verified: true
      }],
      shareholders: [],
      source: 'ceidg_api',
      confidence: 'verified'
    };
  } catch (error) {
    console.error('[CEIDG] Parse error:', error);
    return null;
  }
}

// Detect legal form from name
function detectLegalForm(name: string): string | null {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('spółka akcyjna') || lowerName.includes(' s.a.') || lowerName.endsWith(' sa')) return 'sa';
  if (lowerName.includes('sp. z o.o.') || lowerName.includes('spółka z ograniczoną')) return 'sp_z_oo';
  if (lowerName.includes('sp.k.') || lowerName.includes('spółka komandytowa')) return 'sp_k';
  if (lowerName.includes('sp.j.') || lowerName.includes('spółka jawna')) return 'sp_j';
  if (lowerName.includes('psa') || lowerName.includes('prosta spółka akcyjna')) return 'psa';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, company_name, email_domain, existing_krs, existing_nip } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company_name && !email_domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_name or email_domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const ceidgToken = Deno.env.get('CEIDG_JWT_TOKEN');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Stage 1] Starting verification for: ${company_name || email_domain}`);

    // Update status to processing
    await supabase
      .from('companies')
      .update({ source_data_status: 'processing' })
      .eq('id', company_id);

    let sourceData: any = {
      verified_at: new Date().toISOString(),
      company_name_input: company_name,
      email_domain_input: email_domain
    };

    let krs = existing_krs;
    let nip = existing_nip;

    // Step 1: Perplexity basic search if we don't have KRS/NIP
    if (perplexityKey && !krs && !nip) {
      const searchResult = await searchBasicInfo(company_name || email_domain, perplexityKey);
      if (searchResult.krs) krs = searchResult.krs;
      if (searchResult.nip) nip = searchResult.nip;
      if (searchResult.regon) sourceData.regon = searchResult.regon;
      if (searchResult.info) sourceData.perplexity_info = searchResult.info;
      console.log(`[Stage 1] Perplexity found: KRS=${krs}, NIP=${nip}`);
    }

    // Step 2: KRS API if we have KRS or detected spółka form
    const legalForm = detectLegalForm(company_name || '');
    if (krs || legalForm) {
      if (krs) {
        const krsData = await fetchKRSData(krs);
        if (krsData) {
          const parsed = parseKRSResponse(krsData);
          if (parsed) {
            sourceData = { ...sourceData, ...parsed };
            console.log(`[Stage 1] KRS data parsed successfully`);
          }
        }
      }
    }

    // Step 3: CEIDG if we have NIP and no KRS data
    if (nip && ceidgToken && !sourceData.source) {
      const ceidgData = await fetchCEIDGData(nip, ceidgToken);
      if (ceidgData) {
        const parsed = parseCEIDGResponse(ceidgData);
        if (parsed) {
          sourceData = { ...sourceData, ...parsed };
          console.log(`[Stage 1] CEIDG data parsed successfully`);
        }
      }
    }

    // If no API data, at least record what we searched for
    if (!sourceData.source) {
      sourceData.source = 'perplexity_only';
      sourceData.confidence = 'low';
    }

    // Add the found IDs
    if (krs && !sourceData.krs) sourceData.krs = krs;
    if (nip && !sourceData.nip) sourceData.nip = nip;

    // Save to database
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        source_data_api: sourceData,
        source_data_status: 'completed',
        source_data_date: new Date().toISOString(),
        // Also update main fields if verified
        ...(sourceData.nip && !existing_nip ? { nip: sourceData.nip } : {}),
        ...(sourceData.krs && !existing_krs ? { krs: sourceData.krs } : {}),
        ...(sourceData.regon ? { regon: sourceData.regon } : {}),
        ...(sourceData.address ? { address: sourceData.address } : {}),
        ...(sourceData.city ? { city: sourceData.city } : {}),
        ...(sourceData.postal_code ? { postal_code: sourceData.postal_code } : {}),
        ...(sourceData.legal_form ? { legal_form: sourceData.legal_form } : {}),
      })
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 1] Database update error:', updateError);
      throw updateError;
    }

    console.log(`[Stage 1] Completed successfully for ${company_name || email_domain}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: sourceData,
        has_krs: !!sourceData.krs,
        has_nip: !!sourceData.nip,
        source: sourceData.source
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Stage 1] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

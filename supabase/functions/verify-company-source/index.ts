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
    const rawContent = data?.choices?.[0]?.message?.content || '';
    
    // Clean Perplexity citation markers [1][2] etc. before parsing
    const content = rawContent.replace(/\[\d+\]/g, '');
    
    // Extract registry IDs with improved patterns that handle various formats
    // NIP: 10 digits, possibly with dashes/spaces
    const nipMatch = content.match(/NIP[:\s]*(\d{10}|\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2})(?:[,.\s]|$)/i);
    // KRS: exactly 10 digits
    const krsMatch = content.match(/KRS[:\s]*(\d{10})(?:[,.\s]|$)/i);
    // REGON: 9 or 14 digits
    const regonMatch = content.match(/REGON[:\s]*(\d{9}|\d{14})(?:[,.\s]|$)/i);
    
    const extractedKrs = krsMatch ? krsMatch[1] : undefined;
    const extractedNip = nipMatch ? nipMatch[1].replace(/[-\s]/g, '') : undefined;
    const extractedRegon = regonMatch ? regonMatch[1] : undefined;
    
    console.log(`[Perplexity] Extracted: KRS=${extractedKrs}, NIP=${extractedNip}, REGON=${extractedRegon}`);
    
    return {
      nip: extractedNip,
      krs: extractedKrs,
      regon: extractedRegon,
      info: rawContent // Keep original with citations for reference
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
    const dzial6 = dane?.dzial6 || {};
    
    // Get name
    const danePodmiotu = dzial1?.danePodmiotu || {};
    const nazwa = danePodmiotu?.nazwa || '';
    
    // Get address - full registered address
    const siedziba = dzial1?.siedzibaIAdres?.adres || {};
    const addressParts = [
      siedziba?.ulica ? `ul. ${siedziba.ulica}` : null,
      siedziba?.nrDomu,
      siedziba?.nrLokalu ? `/${siedziba.nrLokalu}` : null,
    ].filter(Boolean).join(' ');
    
    const addressFull = [
      addressParts,
      siedziba?.kodPocztowy,
      siedziba?.miejscowosc
    ].filter(Boolean).join(', ');
    
    // Get NIP/REGON
    const identyfikatory = dzial1?.danePodmiotu?.identyfikatory || {};
    
    // Get company status from dzial6
    const statusInfo = dzial6?.informacjeOWpisachDoRejestruIWykresleniach || {};
    const czyWykreslony = statusInfo?.czyWykreslony === true || statusInfo?.dataWykreslenia;
    const czyZawieszona = statusInfo?.czyZawieszona === true;
    const status = czyWykreslony ? 'WYKREŚLONA' : 
                   czyZawieszona ? 'ZAWIESZONA' : 'AKTYWNA';
    
    // Get management (Zarząd)
    const management: Array<{name: string; position: string; verified: boolean}> = [];
    
    // Parse Zarząd from organReprezentacji
    const organRep = dzial2?.organReprezentacji || {};
    const skladOrganu = organRep?.skladOrganu || organRep?.sklad || [];
    const zarzadArray = Array.isArray(skladOrganu) ? skladOrganu : [skladOrganu];
    
    zarzadArray.forEach((osoba: any) => {
      if (osoba?.imiona && osoba?.nazwisko) {
        management.push({
          name: `${osoba.imiona} ${osoba.nazwisko}`,
          position: osoba.funkcja || 'Członek Zarządu',
          verified: true
        });
      }
    });
    
    // Parse Wspólnicy/Udziałowcy (shareholders)
    const wspolnicy = dzial1?.wspolnicyLubAkcjonariusze || [];
    const shareholders: Array<{name: string; shares?: number; ownership_percent?: number; verified: boolean}> = [];
    const wspolnicyArray = Array.isArray(wspolnicy) ? wspolnicy : [wspolnicy];
    
    wspolnicyArray.forEach((wspolnik: any) => {
      if (wspolnik?.nazwisko || wspolnik?.nazwa) {
        const name = wspolnik?.imiona 
          ? `${wspolnik.imiona} ${wspolnik.nazwisko}` 
          : (wspolnik?.nazwisko || wspolnik?.nazwa);
        shareholders.push({
          name,
          shares: wspolnik?.posiadaneUdzialy?.iloscUdzialow || wspolnik?.liczbaUdzialow,
          ownership_percent: wspolnik?.procentUdzialow,
          verified: true
        });
      }
    });

    // Get PKD codes
    const dzial3 = dane?.dzial3 || {};
    const przedmiotDzialalnosci = dzial3?.przedmiotDzialalnosci || {};
    const pkdPrzewazajaca = przedmiotDzialalnosci?.przedmiotPrzewazajacejDzialalnosci || [];
    const pkdPozostala = przedmiotDzialalnosci?.przedmiotPozostalejDzialalnosci || [];
    
    const pkdPrzewazajacaArray = Array.isArray(pkdPrzewazajaca) ? pkdPrzewazajaca : [pkdPrzewazajaca];
    const pkdPozostalaArray = Array.isArray(pkdPozostala) ? pkdPozostala : [pkdPozostala];
    
    const pkdCodes = [
      ...pkdPrzewazajacaArray.map((p: any) => p?.kodDzial || p?.kod).filter(Boolean),
      ...pkdPozostalaArray.map((p: any) => p?.kodDzial || p?.kod).filter(Boolean)
    ];
    const pkdMain = pkdCodes[0] || null;

    return {
      name_official: nazwa,
      nip: identyfikatory?.nip || null,
      regon: identyfikatory?.regon || null,
      address_registered: addressFull || null,
      address: addressParts || null,
      city: siedziba?.miejscowosc || null,
      postal_code: siedziba?.kodPocztowy || null,
      registration_date: danePodmiotu?.dataRozpoczeciaDzialalnosci || danePodmiotu?.dataWpisuDoRejestruPrzedsieb || null,
      legal_form: danePodmiotu?.formaLubRodzajRejestru || 'spółka',
      pkd_codes: pkdCodes,
      pkd_main: pkdMain,
      management,
      shareholders,
      status,
      source: 'krs_api',
      confidence: 'verified',
      verified_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('[KRS] Parse error:', error);
    return null;
  }
}

// Parse CEIDG response
function parseCEIDGResponse(ceidgData: any): any {
  try {
    const adres = ceidgData?.adresDzialalnosci || {};
    const addressParts = [
      adres?.ulica ? `ul. ${adres.ulica}` : null,
      adres?.budynek,
      adres?.lokal ? `/${adres.lokal}` : null,
    ].filter(Boolean).join(' ');
    
    const addressFull = [
      addressParts,
      adres?.kodPocztowy,
      adres?.miasto
    ].filter(Boolean).join(', ');

    // CEIDG status mapping
    const ceidgStatus = ceidgData?.status;
    const status = ceidgStatus === 'WYKRESLONY' ? 'WYKREŚLONA' :
                   ceidgStatus === 'ZAWIESZONY' ? 'ZAWIESZONA' : 'AKTYWNA';

    const pkdList = ceidgData?.pkd || [];
    const pkdCodes = Array.isArray(pkdList) ? pkdList : [pkdList];
    const pkdMain = ceidgData?.pkdGlowny || pkdCodes[0] || null;

    return {
      name_official: ceidgData?.nazwa || null,
      nip: ceidgData?.wlasciciel?.nip || ceidgData?.nip || null,
      regon: ceidgData?.wlasciciel?.regon || ceidgData?.regon || null,
      address_registered: addressFull || null,
      address: addressParts || null,
      city: adres?.miasto || null,
      postal_code: adres?.kodPocztowy || null,
      registration_date: ceidgData?.dataRozpoczeciaDzialalnosci || null,
      legal_form: 'jednoosobowa_dzialalnosc',
      pkd_codes: pkdCodes.filter(Boolean),
      pkd_main: pkdMain,
      management: [{
        name: `${ceidgData?.wlasciciel?.imie || ''} ${ceidgData?.wlasciciel?.nazwisko || ''}`.trim(),
        position: 'Właściciel',
        verified: true
      }],
      shareholders: [],
      status,
      source: 'ceidg_api',
      confidence: 'verified',
      verified_at: new Date().toISOString()
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
        // Update main fields if verified
        ...(sourceData.nip && !existing_nip ? { nip: sourceData.nip } : {}),
        ...(sourceData.krs && !existing_krs ? { krs: sourceData.krs } : {}),
        ...(sourceData.regon ? { regon: sourceData.regon } : {}),
        ...(sourceData.address ? { address: sourceData.address } : {}),
        ...(sourceData.city ? { city: sourceData.city } : {}),
        ...(sourceData.postal_code ? { postal_code: sourceData.postal_code } : {}),
        ...(sourceData.legal_form ? { legal_form: sourceData.legal_form } : {}),
        // New fields from Stage 1
        ...(sourceData.registration_date ? { registration_date: sourceData.registration_date } : {}),
        ...(sourceData.pkd_codes?.length ? { pkd_codes: sourceData.pkd_codes } : {}),
        ...(sourceData.status ? { company_status: sourceData.status } : {}),
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

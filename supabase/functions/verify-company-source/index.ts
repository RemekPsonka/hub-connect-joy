import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract name from nested KRS structure (same as fetch-krs-data)
function extractName(imionaField: any, nazwiskoField: any): string | null {
  let firstName = '';
  let lastName = '';
  
  if (typeof imionaField === 'string') {
    firstName = imionaField;
  } else if (Array.isArray(imionaField) && imionaField.length > 0) {
    const first = imionaField[0];
    if (first?.imiona?.imie) {
      firstName = first.imiona.imie;
      if (first.imiona.imieDrugie) firstName += ' ' + first.imiona.imieDrugie;
    } else if (first?.imiona && typeof first.imiona === 'string') {
      firstName = first.imiona;
    } else if (typeof first === 'string') {
      firstName = first;
    }
  } else if (imionaField?.imie) {
    firstName = imionaField.imie;
  }
  
  if (typeof nazwiskoField === 'string') {
    lastName = nazwiskoField;
  } else if (Array.isArray(nazwiskoField) && nazwiskoField.length > 0) {
    const first = nazwiskoField[0];
    if (first?.nazwisko?.nazwiskoICzlon) {
      lastName = first.nazwisko.nazwiskoICzlon;
    } else if (first?.nazwisko && typeof first.nazwisko === 'string') {
      lastName = first.nazwisko;
    } else if (typeof first === 'string') {
      lastName = first;
    }
  } else if (nazwiskoField?.nazwiskoICzlon) {
    lastName = nazwiskoField.nazwiskoICzlon;
  }
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return null;
}

// Helper to extract position/function
function extractPosition(funkcjaField: any): string {
  if (typeof funkcjaField === 'string') return funkcjaField;
  if (Array.isArray(funkcjaField) && funkcjaField.length > 0) {
    const first = funkcjaField[0];
    return first?.funkcjaWOrganie || first?.funkcja || 'Członek Zarządu';
  }
  if (funkcjaField?.funkcjaWOrganie) return funkcjaField.funkcjaWOrganie;
  return 'Członek Zarządu';
}

// KRS API - using OdpisPelny endpoint (same as fetch-krs-data)
async function fetchKRSData(krs: string): Promise<any | null> {
  const krsNormalized = krs.padStart(10, '0');
  
  // Try P register first (businesses)
  console.log(`[KRS] Trying P register for KRS ${krsNormalized}`);
  const urlP = `https://api-krs.ms.gov.pl/api/krs/OdpisPelny/${krsNormalized}?rejestr=P&format=json`;
  
  try {
    const responseP = await fetch(urlP);
    if (responseP.ok) {
      console.log(`[KRS] Found in P register`);
      return await responseP.json();
    }
  } catch (e) {
    console.log(`[KRS] P register fetch failed:`, e);
  }
  
  // Try S register (associations/foundations)
  console.log(`[KRS] Trying S register for KRS ${krsNormalized}`);
  const urlS = `https://api-krs.ms.gov.pl/api/krs/OdpisPelny/${krsNormalized}?rejestr=S&format=json`;
  
  try {
    const responseS = await fetch(urlS);
    if (responseS.ok) {
      console.log(`[KRS] Found in S register`);
      return await responseS.json();
    }
  } catch (e) {
    console.log(`[KRS] S register fetch failed:`, e);
  }
  
  console.log(`[KRS] Not found in any register`);
  return null;
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

// Extract address from Perplexity text response
function parseAddressFromPerplexity(text: string): { address?: string; city?: string; postal_code?: string } {
  const result: { address?: string; city?: string; postal_code?: string } = {};
  
  // Clean text
  const cleanText = text
    .replace(/\[\d+\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '');
  
  // Pattern: "ul. Nazwa 123, 00-000 Miasto" or "Adres: ul. Nazwa 123"
  const addressMatch = cleanText.match(/(?:Adres(?:\s+siedziby)?|Siedziba)\s*[:\-]?\s*([^,\n]+(?:,\s*)?(?:\d{2}[-\s]?\d{3})?\s*[A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+)/i);
  if (addressMatch) {
    const fullAddress = addressMatch[1].trim();
    
    // Extract postal code and city
    const postalCityMatch = fullAddress.match(/(\d{2}[-\s]?\d{3})\s*([A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+(?:\s+[A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+)?)/);
    if (postalCityMatch) {
      result.postal_code = postalCityMatch[1].replace(/\s/g, '-');
      result.city = postalCityMatch[2];
      // Street is everything before postal code
      const streetPart = fullAddress.substring(0, fullAddress.indexOf(postalCityMatch[1])).replace(/,\s*$/, '').trim();
      if (streetPart) result.address = streetPart;
    } else {
      // Just try to extract city from end of address
      const cityOnlyMatch = fullAddress.match(/,?\s*([A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+(?:\s+[A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+)?)$/);
      if (cityOnlyMatch) {
        result.city = cityOnlyMatch[1];
        result.address = fullAddress.substring(0, fullAddress.lastIndexOf(cityOnlyMatch[1])).replace(/,\s*$/, '').trim();
      }
    }
  }
  
  return result;
}

// Perplexity basic search - find KRS/NIP if unknown
async function searchBasicInfo(
  companyName: string, 
  apiKey: string
): Promise<{ krs?: string; nip?: string; regon?: string; info?: string; address?: string; city?: string; postal_code?: string }> {
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
    
    // Clean Perplexity markdown formatting AND citation markers before parsing
    const content = rawContent
      .replace(/\[\d+\]/g, '')     // Remove [1][2][3] citations
      .replace(/\*\*/g, '')        // Remove **bold** markdown
      .replace(/\*/g, '')          // Remove *italic* markdown
      .replace(/`/g, '');          // Remove `code` markdown
    
    console.log(`[Perplexity] Cleaned content preview: ${content.substring(0, 300)}`);
    
    // Extract registry IDs with flexible patterns (handle various separators)
    let extractedNip: string | undefined;
    let extractedKrs: string | undefined;
    let extractedRegon: string | undefined;
    
    // NIP patterns - handle "NIP: 1234567890", "NIP 123-456-78-90", etc.
    const nipMatch = content.match(/NIP\s*[:\-]?\s*(\d{10}|\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2})/i);
    if (nipMatch) {
      extractedNip = nipMatch[1].replace(/[-\s]/g, '');
    } else {
      // Fallback: find 10-digit number near "NIP" keyword
      const nipFallback = content.match(/NIP.{0,15}?(\d{10})/i);
      if (nipFallback) extractedNip = nipFallback[1];
    }
    
    // KRS patterns - handle "KRS: 0000123456", "KRS 123456" (auto-pad), etc.
    const krsMatch = content.match(/KRS\s*[:\-]?\s*(\d{10}|\d{6,9})/i);
    if (krsMatch) {
      extractedKrs = krsMatch[1].padStart(10, '0'); // Always 10 digits
    } else {
      // Fallback: find 10-digit number near "KRS" keyword
      const krsFallback = content.match(/KRS.{0,15}?(\d{10})/i);
      if (krsFallback) extractedKrs = krsFallback[1];
    }
    
    // REGON patterns - handle 9 or 14 digit REGON
    const regonMatch = content.match(/REGON\s*[:\-]?\s*(\d{14}|\d{9})/i);
    if (regonMatch) {
      extractedRegon = regonMatch[1];
    } else {
      // Fallback: find 9 or 14 digit number near "REGON" keyword
      const regonFallback = content.match(/REGON.{0,15}?(\d{14}|\d{9})/i);
      if (regonFallback) extractedRegon = regonFallback[1];
    }
    
    // Extract address from Perplexity response
    const addressData = parseAddressFromPerplexity(rawContent);
    
    console.log(`[Perplexity] Extracted: KRS=${extractedKrs}, NIP=${extractedNip}, REGON=${extractedRegon}, city=${addressData.city}`);
    
    return {
      nip: extractedNip,
      krs: extractedKrs,
      regon: extractedRegon,
      info: rawContent,
      ...addressData
    };
  } catch (error) {
    console.error('[Perplexity] Error:', error);
    return {};
  }
}

// Parse KRS response - using OdpisPelny structure (same as fetch-krs-data)
function parseKRSResponse(krsData: any): any {
  try {
    const dzial1 = krsData?.odpis?.dane?.dzial1;
    const dzial2 = krsData?.odpis?.dane?.dzial2;
    const dzial3 = krsData?.odpis?.dane?.dzial3;
    const dzial6 = krsData?.odpis?.dane?.dzial6;
    const napiData = krsData?.odpis?.dane?.napiData;
    
    if (!dzial1) {
      console.log(`[KRS] No dzial1 in response`);
      return null;
    }
    
    // Handle company name - can be string, array of objects, or nested object
    const rawNazwa = dzial1?.danePodmiotu?.nazwa;
    let companyName: string | null = null;
    if (Array.isArray(rawNazwa) && rawNazwa.length > 0) {
      companyName = rawNazwa[0]?.nazwa || String(rawNazwa[0]) || null;
    } else if (typeof rawNazwa === 'string') {
      companyName = rawNazwa;
    } else if (rawNazwa && typeof rawNazwa === 'object') {
      companyName = (rawNazwa as any).nazwa || String(rawNazwa);
    }
    
    // NIP and REGON from napiData (official source - 100% confidence)
    const nip = napiData?.nip || null;
    const regon = napiData?.regon || null;
    
    // Address
    const siedzibaAdres = dzial1?.siedzibaIAdres?.adres;
    const siedziba = dzial1?.siedzibaIAdres?.siedziba;
    
    let addressParts = '';
    if (siedzibaAdres?.ulica) {
      addressParts = siedzibaAdres.ulica;
      if (siedzibaAdres.nrDomu) addressParts += ` ${siedzibaAdres.nrDomu}`;
      if (siedzibaAdres.nrLokalu) addressParts += `/${siedzibaAdres.nrLokalu}`;
    }
    
    const city = siedzibaAdres?.miejscowosc || siedziba?.miejscowosc || null;
    const postalCode = siedzibaAdres?.kodPocztowy || null;
    
    const addressFull = [addressParts, postalCode, city].filter(Boolean).join(', ');
    
    // Legal form
    const rawFormaPrawna = dzial1?.danePodmiotu?.formaPrawna;
    let formaPrawna: string | null = null;
    if (typeof rawFormaPrawna === 'string') {
      formaPrawna = rawFormaPrawna;
    } else if (rawFormaPrawna && typeof rawFormaPrawna === 'object') {
      formaPrawna = (rawFormaPrawna as any).nazwa || (rawFormaPrawna as any).wartość || null;
    }
    
    // Map legal form to code
    const legalFormMap: Record<string, string> = {
      'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ': 'sp_z_oo',
      'SPÓŁKA AKCYJNA': 'sa',
      'SPÓŁKA JAWNA': 'sp_j',
      'SPÓŁKA PARTNERSKA': 'sp_p',
      'SPÓŁKA KOMANDYTOWA': 'sp_k',
      'SPÓŁKA KOMANDYTOWO-AKCYJNA': 'sp_ka',
    };
    const legalForm = formaPrawna ? (legalFormMap[formaPrawna.toUpperCase()] || 'spółka') : 'spółka';
    
    // Extract management persons
    const management: Array<{ name: string; position: string; verified: boolean }> = [];
    const reprezentacja = dzial2?.reprezentacja;
    
    // Collect all possible sources of management data
    const skladSources: any[] = [];
    if (reprezentacja?.sklad) skladSources.push(reprezentacja.sklad);
    if (reprezentacja?.skladOrganu) skladSources.push(reprezentacja.skladOrganu);
    if (reprezentacja?.organReprezentacji?.sklad) skladSources.push(reprezentacja.organReprezentacji.sklad);
    
    // If reprezentacja is an array (OdpisPelny format)
    if (Array.isArray(reprezentacja)) {
      for (const rep of reprezentacja) {
        if (rep.sklad) skladSources.push(rep.sklad);
        if (rep.skladOrganu) skladSources.push(rep.skladOrganu);
      }
    }
    
    for (const sklad of skladSources) {
      if (Array.isArray(sklad)) {
        for (const personEntry of sklad) {
          const fullName = extractName(personEntry.imiona, personEntry.nazwisko);
          if (fullName) {
            const position = extractPosition(personEntry.funkcjaWOrganie || personEntry.funkcja);
            management.push({ name: fullName, position, verified: true });
          }
          
          // Handle nested sklad/osoby
          const nestedPersons = personEntry.sklad || personEntry.osoby || [];
          if (Array.isArray(nestedPersons)) {
            for (const nested of nestedPersons) {
              const nestedName = extractName(nested.imiona, nested.nazwisko);
              if (nestedName) {
                const nestedPosition = extractPosition(nested.funkcjaWOrganie || nested.funkcja);
                management.push({ name: nestedName, position: nestedPosition, verified: true });
              }
            }
          }
        }
      }
    }
    
    // Company status from dzial6
    const statusInfo = dzial6?.informacjeOWpisachDoRejestruIWykresleniach || {};
    const czyWykreslony = statusInfo?.czyWykreslony === true || statusInfo?.dataWykreslenia;
    const czyZawieszona = statusInfo?.czyZawieszona === true;
    const status = czyWykreslony ? 'WYKREŚLONA' : czyZawieszona ? 'ZAWIESZONA' : 'AKTYWNA';
    
    // PKD codes from dzial3
    const przedmiotDzialalnosci = dzial3?.przedmiotDzialalnosci || {};
    const pkdPrzewazajaca = przedmiotDzialalnosci?.przedmiotPrzewazajacejDzialalnosci || [];
    const pkdPozostala = przedmiotDzialalnosci?.przedmiotPozostalejDzialalnosci || [];
    
    const pkdPrzewazajacaArray = Array.isArray(pkdPrzewazajaca) ? pkdPrzewazajaca : [pkdPrzewazajaca];
    const pkdPozostalaArray = Array.isArray(pkdPozostala) ? pkdPozostala : [pkdPozostala];
    
    const pkdCodes = [
      ...pkdPrzewazajacaArray.map((p: any) => p?.kodDzial || p?.kod).filter(Boolean),
      ...pkdPozostalaArray.map((p: any) => p?.kodDzial || p?.kod).filter(Boolean)
    ];
    
    console.log(`[KRS] Parsed: name=${companyName}, nip=${nip}, regon=${regon}, management=${management.length} persons`);
    
    return {
      name_official: companyName,
      nip: nip,
      regon: regon,
      address_registered: addressFull || null,
      address: addressParts || null,
      city: city,
      postal_code: postalCode,
      registration_date: dzial1?.danePodmiotu?.dataRozpoczeciaDzialalnosci || null,
      legal_form: legalForm,
      pkd_codes: pkdCodes,
      pkd_main: pkdCodes[0] || null,
      management,
      shareholders: [],
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
      // Extract address from Perplexity as fallback
      if (searchResult.address) sourceData.address_perplexity = searchResult.address;
      if (searchResult.city) sourceData.city_perplexity = searchResult.city;
      if (searchResult.postal_code) sourceData.postal_code_perplexity = searchResult.postal_code;
      console.log(`[Stage 1] Perplexity found: KRS=${krs}, NIP=${nip}, city=${searchResult.city}`);
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

    // If no API data, at least record what we searched for and use Perplexity fallbacks
    if (!sourceData.source) {
      sourceData.source = 'perplexity_only';
      sourceData.confidence = 'low';
      // Use Perplexity address data as fallback when no KRS/CEIDG data
      if (sourceData.address_perplexity && !sourceData.address) {
        sourceData.address = sourceData.address_perplexity;
      }
      if (sourceData.city_perplexity && !sourceData.city) {
        sourceData.city = sourceData.city_perplexity;
      }
      if (sourceData.postal_code_perplexity && !sourceData.postal_code) {
        sourceData.postal_code = sourceData.postal_code_perplexity;
      }
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

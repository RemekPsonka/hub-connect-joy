import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================
// PKD Code to Industry Mapping Dictionary
// =============================================
const PKD_INDUSTRY_MAP: Record<string, string> = {
  '01': 'Rolnictwo',
  '02': 'Leśnictwo',
  '03': 'Rybactwo',
  '05': 'Górnictwo węgla',
  '06': 'Górnictwo ropy i gazu',
  '07': 'Górnictwo rud metali',
  '08': 'Górnictwo pozostałe',
  '09': 'Usługi górnicze',
  '10': 'Produkcja żywności',
  '11': 'Produkcja napojów',
  '12': 'Produkcja wyrobów tytoniowych',
  '13': 'Produkcja tekstyliów',
  '14': 'Produkcja odzieży',
  '15': 'Produkcja skóry',
  '16': 'Produkcja drewna',
  '17': 'Produkcja papieru',
  '18': 'Poligrafia',
  '19': 'Produkcja paliw',
  '20': 'Przemysł chemiczny',
  '21': 'Przemysł farmaceutyczny',
  '22': 'Produkcja wyrobów z gumy i tworzyw',
  '23': 'Produkcja minerałów niemetalicznych',
  '24': 'Przemysł metalurgiczny',
  '25': 'Produkcja wyrobów metalowych',
  '26': 'Elektronika i optyka',
  '27': 'Urządzenia elektryczne',
  '28': 'Maszyny i urządzenia',
  '29': 'Produkcja pojazdów',
  '30': 'Produkcja środków transportu',
  '31': 'Produkcja mebli',
  '32': 'Pozostała produkcja',
  '33': 'Naprawa maszyn i urządzeń',
  '35': 'Energia i gaz',
  '36': 'Pobór i dystrybucja wody',
  '37': 'Odprowadzanie ścieków',
  '38': 'Gospodarka odpadami',
  '39': 'Rekultywacja',
  '41': 'Budownictwo mieszkaniowe',
  '42': 'Inżynieria lądowa',
  '43': 'Roboty budowlane',
  '45': 'Handel pojazdami',
  '46': 'Handel hurtowy',
  '47': 'Handel detaliczny',
  '49': 'Transport lądowy',
  '50': 'Transport wodny',
  '51': 'Transport lotniczy',
  '52': 'Magazynowanie i logistyka',
  '53': 'Poczta i kurierzy',
  '55': 'Zakwaterowanie',
  '56': 'Gastronomia',
  '58': 'Wydawnictwa',
  '59': 'Film i produkcja wideo',
  '60': 'Nadawanie programów',
  '61': 'Telekomunikacja',
  '62': 'IT i oprogramowanie',
  '63': 'Usługi informacyjne',
  '64': 'Finanse i bankowość',
  '65': 'Ubezpieczenia',
  '66': 'Usługi finansowe',
  '68': 'Nieruchomości',
  '69': 'Prawo i księgowość',
  '70': 'Zarządzanie i doradztwo',
  '71': 'Architektura i inżynieria',
  '72': 'Badania i rozwój',
  '73': 'Reklama i marketing',
  '74': 'Projektowanie i fotografia',
  '75': 'Weterynaria',
  '77': 'Wynajem i dzierżawa',
  '78': 'HR i rekrutacja',
  '79': 'Turystyka',
  '80': 'Ochrona',
  '81': 'Usługi dla budynków',
  '82': 'Usługi biurowe',
  '84': 'Administracja publiczna',
  '85': 'Edukacja',
  '86': 'Ochrona zdrowia',
  '87': 'Pomoc społeczna stacjonarna',
  '88': 'Opieka społeczna',
  '90': 'Kultura i rozrywka',
  '91': 'Biblioteki i muzea',
  '92': 'Hazard',
  '93': 'Sport i rekreacja',
  '94': 'Organizacje członkowskie',
  '95': 'Naprawa sprzętu',
  '96': 'Usługi indywidualne',
  '97': 'Gospodarstwa domowe',
  '99': 'Organizacje międzynarodowe',
};

/**
 * Get industry name from PKD code (first 2 digits)
 */
function getIndustryFromPKD(pkdCode: string | null | undefined): string | null {
  if (!pkdCode) return null;
  const prefix = pkdCode.substring(0, 2);
  return PKD_INDUSTRY_MAP[prefix] || null;
}

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

/**
 * Normalize REGON to 9-digit format.
 * KRS API sometimes returns 14-digit REGON (for local units), but standard is 9 digits.
 */
function normalizeRegon(regon: string | null | undefined): string | null {
  if (!regon) return null;
  const clean = regon.replace(/\D/g, '');
  // If 14 digits (local unit format), take first 9 (company identifier)
  if (clean.length === 14) {
    return clean.substring(0, 9);
  }
  return clean;
}

/**
 * KRS OdpisPełny returns arrays with history entries (nrWpisuWprow/nrWpisuWykr).
 * This function returns the latest active (not deleted) entry from the array.
 */
function getLatestEntry<T>(entries: T[] | T | undefined): T | null {
  if (!entries) return null;
  if (!Array.isArray(entries)) return entries as T;
  if (entries.length === 0) return null;
  
  // Filter out deleted entries (those with nrWpisuWykr set)
  const activeEntries = (entries as any[]).filter(e => !e?.nrWpisuWykr);
  
  // Return last active entry, or last entry if all were deleted
  return activeEntries.length > 0 
    ? activeEntries[activeEntries.length - 1] 
    : entries[entries.length - 1];
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
  
  // Clean text - remove markdown and citations
  const cleanText = text
    .replace(/\[\d+\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '');
  
  // Pattern 1: Direct format "ul. Nazwa 123, 00-000 Miasto" (most common)
  const simpleAddressMatch = cleanText.match(
    /(?:ul\.|ulica)\s+([A-ZŁÓŚŻŹĆĄa-złóśżźćąę\s]+)\s+(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*,?\s*(\d{2}[-\s]?\d{3})\s+([A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+)/i
  );
  if (simpleAddressMatch) {
    result.address = `ul. ${simpleAddressMatch[1].trim()} ${simpleAddressMatch[2]}`;
    result.postal_code = simpleAddressMatch[3].replace(/\s/g, '-');
    result.city = simpleAddressMatch[4];
    console.log(`[Perplexity] Extracted address (pattern 1): ${result.address}, ${result.postal_code} ${result.city}`);
    return result;
  }
  
  // Pattern 2: "Adres siedziby: ul. Nazwa 123, 00-000 Miasto"
  const labeledAddressMatch = cleanText.match(
    /(?:Adres(?:\s+siedziby)?|Siedziba)\s*[:\-]?\s*(?:ul\.|ulica)?\s*([A-ZŁÓŚŻŹĆĄa-złóśżźćąę\s]+)\s+(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*,?\s*(\d{2}[-\s]?\d{3})\s+([A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+)/i
  );
  if (labeledAddressMatch) {
    result.address = `ul. ${labeledAddressMatch[1].trim()} ${labeledAddressMatch[2]}`;
    result.postal_code = labeledAddressMatch[3].replace(/\s/g, '-');
    result.city = labeledAddressMatch[4];
    console.log(`[Perplexity] Extracted address (pattern 2): ${result.address}, ${result.postal_code} ${result.city}`);
    return result;
  }
  
  // Pattern 3: Fallback - find any postal code pattern with city
  const postalCityFallback = cleanText.match(/(\d{2}[-\s]?\d{3})\s+([A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+(?:\s+[A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+)?)/);
  if (postalCityFallback) {
    result.postal_code = postalCityFallback[1].replace(/\s/g, '-');
    result.city = postalCityFallback[2];
    // Try to find street before postal code
    const beforePostal = cleanText.substring(0, cleanText.indexOf(postalCityFallback[0]));
    const streetMatch = beforePostal.match(/(?:ul\.|ulica)\s+([A-ZŁÓŚŻŹĆĄa-złóśżźćąę\s]+\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*,?\s*$/i);
    if (streetMatch) {
      result.address = `ul. ${streetMatch[1].trim()}`;
    }
    console.log(`[Perplexity] Extracted address (pattern 3): ${result.address || 'none'}, ${result.postal_code} ${result.city}`);
    return result;
  }
  
  return result;
}

// Extract website URL from Perplexity text response
function extractWebsiteFromPerplexity(text: string): string | undefined {
  // Clean text
  const cleanText = text.replace(/\[\d+\]/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
  
  // Pattern: www.domain.pl or https://domain.pl or domain.pl (common Polish TLDs)
  const websiteMatch = cleanText.match(
    /(?:https?:\/\/)?(?:www\.)?([a-z0-9][-a-z0-9]*\.(?:pl|com|eu|net|org|com\.pl|biz)(?:\/[^\s]*)?)/i
  );
  if (websiteMatch) {
    const domain = websiteMatch[1].split('/')[0]; // Get just the domain part
    return `https://${domain.replace(/^www\./, '')}`;
  }
  return undefined;
}

// Perplexity basic search - find KRS/NIP if unknown
async function searchBasicInfo(
  companyName: string, 
  apiKey: string
): Promise<{ krs?: string; nip?: string; regon?: string; info?: string; website?: string; address?: string; city?: string; postal_code?: string }> {
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
- Główna branża/sektor działalności
- Główny kod PKD (jeśli znany)

Odpowiedz krótko, tylko fakty.`
        }],
        max_tokens: 600,
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
    
    // Extract website from Perplexity response
    const extractedWebsite = extractWebsiteFromPerplexity(rawContent);
    
    return {
      nip: extractedNip,
      krs: extractedKrs,
      regon: extractedRegon,
      info: rawContent,
      website: extractedWebsite,
      ...addressData
    };
  } catch (error) {
    console.error('[Perplexity] Error:', error);
    return {};
  }
}

// Helper: Extract shareholders from dzial2
function extractShareholders(dzial2: any): Array<{
  name: string;
  type: 'person' | 'company';
  shares_count?: number;
  shares_value?: number;
  krs?: string;
  nip?: string;
  verified: boolean;
}> {
  const shareholders: Array<{
    name: string;
    type: 'person' | 'company';
    shares_count?: number;
    shares_value?: number;
    krs?: string;
    nip?: string;
    verified: boolean;
  }> = [];
  
  try {
    const wspolnicy = dzial2?.wspolnicy || {};
    
    // DEBUG: Log wspolnicy structure
    console.log('[KRS] DEBUG - Wspolnicy structure:', JSON.stringify({
      wspolnicy_keys: Object.keys(wspolnicy),
      wspolnicy_type: typeof wspolnicy,
      wspolnicy_isArray: Array.isArray(wspolnicy),
      wspolnicy_raw: wspolnicy
    }, null, 2).substring(0, 2000));
    
    // Wspólnicy sp. z o.o. - try multiple key patterns
    const wspolnikSpZoo = wspolnicy?.wspolnikSpZoo || 
                          wspolnicy?.wspolnik || 
                          wspolnicy?.wspólnikSpZoo ||
                          wspolnicy?.wspólnik ||
                          wspolnicy?.udzialowiec ||
                          wspolnicy?.udziałowiec ||
                          [];
    const wspolnikArray = Array.isArray(wspolnikSpZoo) ? wspolnikSpZoo : (wspolnikSpZoo ? [wspolnikSpZoo] : []);
    
    console.log(`[KRS] DEBUG - wspolnikSpZoo entries: ${wspolnikArray.length}`);
    
    for (const w of wspolnikArray) {
      if (!w) continue;
      const osoba = w?.wspólnik?.osoba || w?.wspolnik?.osoba || w?.osoba || w?.dane || w;
      const udzialy = w?.posiadaneUdzialy || w?.udzialy || w?.iloscPosiadanychUdzialow || {};
      
      const imiona = osoba?.imiona || osoba?.imie;
      const nazwisko = osoba?.nazwisko;
      const name = extractName(imiona, nazwisko);
      
      if (name) {
        shareholders.push({
          name,
          type: 'person',
          shares_count: parseFloat(String(udzialy?.liczbaUdzialow || udzialy?.iloscUdzialow || udzialy?.liczba || udzialy?.ilosc || '0').replace(/[^\d]/g, '')) || undefined,
          shares_value: parseFloat(String(udzialy?.wartoscUdzialow?.wartosc || udzialy?.wartoscUdzialow || udzialy?.wartoscNominalna || udzialy?.wartosc || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || undefined,
          verified: true
        });
      }
    }
    
    // Wspólnicy - osoby prawne - try multiple key patterns
    const wspolnikPrawny = wspolnicy?.wspolnikPrawny || 
                           wspolnicy?.wspólnikPrawny ||
                           wspolnicy?.osobaPrawna ||
                           [];
    const prawnyArray = Array.isArray(wspolnikPrawny) ? wspolnikPrawny : (wspolnikPrawny ? [wspolnikPrawny] : []);
    
    console.log(`[KRS] DEBUG - wspolnikPrawny entries: ${prawnyArray.length}`);
    
    for (const w of prawnyArray) {
      if (!w) continue;
      const udzialy = w?.posiadaneUdzialy || w?.udzialy || {};
      
      shareholders.push({
        name: w?.nazwa || w?.firma || w?.firmaLubNazwa || 'Osoba prawna',
        type: 'company',
        krs: w?.krs || undefined,
        nip: w?.nip || undefined,
        shares_count: parseFloat(String(udzialy?.liczbaUdzialow || '0').replace(/[^\d]/g, '')) || undefined,
        shares_value: parseFloat(String(udzialy?.wartoscUdzialow?.wartosc || udzialy?.wartoscUdzialow || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || undefined,
        verified: true
      });
    }
    
    // If wspolnicy is an array directly (some formats)
    if (Array.isArray(dzial2?.wspolnicy)) {
      console.log('[KRS] DEBUG - wspolnicy is array with', dzial2.wspolnicy.length, 'entries');
      for (const w of dzial2.wspolnicy) {
        if (!w) continue;
        const osoba = w?.osoba || w;
        const name = extractName(osoba?.imiona || osoba?.imie, osoba?.nazwisko);
        if (name && !shareholders.find(s => s.name === name)) {
          const udzialy = w?.posiadaneUdzialy || w?.udzialy || {};
          shareholders.push({
            name,
            type: 'person',
            shares_count: parseFloat(String(udzialy?.liczbaUdzialow || '0').replace(/[^\d]/g, '')) || undefined,
            shares_value: parseFloat(String(udzialy?.wartoscUdzialow?.wartosc || udzialy?.wartoscUdzialow || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || undefined,
            verified: true
          });
        }
      }
    }
  } catch (e) {
    console.error('[KRS] Error extracting shareholders:', e);
  }
  
  console.log(`[KRS] Total shareholders extracted: ${shareholders.length}`);
  return shareholders;
}

// Helper: Extract procurators from dzial2
function extractProcurators(dzial2: any): Array<{ name: string; type: string; verified: boolean }> {
  const procurators: Array<{ name: string; type: string; verified: boolean }> = [];
  
  try {
    // DEBUG: Log prokura/prokurenci structure
    console.log('[KRS] DEBUG - Prokurenci structure:', JSON.stringify({
      dzial2_keys: Object.keys(dzial2 || {}),
      prokurenci_exists: !!dzial2?.prokurenci,
      prokura_exists: !!dzial2?.prokura,
      prokurenci_type: typeof dzial2?.prokurenci,
      prokurenci_sample: dzial2?.prokurenci
    }, null, 2).substring(0, 2000));
    
    // Try multiple key names for prokura (KRS API varies)
    const prokura = dzial2?.prokurenci || dzial2?.prokura || dzial2?.prokurent || [];
    const prokuraArray = Array.isArray(prokura) ? prokura : (prokura ? [prokura] : []);
    
    for (const p of prokuraArray) {
      if (!p) continue;
      
      // Get prokura type - rodzajProkury can be an ARRAY with history
      const rodzajArray = p?.rodzajProkury || p?.rodzaj || 'Prokura';
      let rodzaj: string;
      if (Array.isArray(rodzajArray)) {
        const latestRodzaj = getLatestEntry(rodzajArray);
        rodzaj = typeof latestRodzaj === 'string' ? latestRodzaj : (latestRodzaj?.rodzaj || latestRodzaj?.nazwa || 'Prokura');
      } else {
        rodzaj = typeof rodzajArray === 'string' ? rodzajArray : 'Prokura';
      }
      
      // Extract persons from sklad - sklad entries can also have history
      const sklad = p?.sklad || p?.prokurenci || [];
      const skladArray = Array.isArray(sklad) ? sklad : [sklad];
      
      for (const person of skladArray) {
        if (!person) continue;
        // Person fields might be arrays with history too
        const latestPerson = getLatestEntry(Array.isArray(person) ? person : [person]);
        if (!latestPerson) continue;
        
        const name = extractName(latestPerson.imiona || latestPerson.imie, latestPerson.nazwisko);
        if (name) {
          procurators.push({
            name,
            type: rodzaj,
            verified: true
          });
        }
      }
      
      // If prokura entry has direct name (single prokurent)
      if (!sklad.length && (p?.imiona || p?.imie)) {
        const name = extractName(p.imiona || p.imie, p.nazwisko);
        if (name) {
          procurators.push({
            name,
            type: rodzaj,
            verified: true
          });
        }
      }
    }
  } catch (e) {
    console.error('[KRS] Error extracting procurators:', e);
  }
  
  return procurators;
}

// Helper: Extract supervisory board from dzial2
function extractSupervisoryBoard(dzial2: any): Array<{ name: string; position: string; verified: boolean }> {
  const board: Array<{ name: string; position: string; verified: boolean }> = [];
  
  try {
    const organNadzoru = dzial2?.organNadzoru || dzial2?.radaNadzorcza || [];
    const organArray = Array.isArray(organNadzoru) ? organNadzoru : [organNadzoru];
    
    for (const organ of organArray) {
      if (!organ) continue;
      
      const sklad = organ?.sklad || organ?.skladOrganu || [];
      const skladArray = Array.isArray(sklad) ? sklad : [sklad];
      
      for (const person of skladArray) {
        if (!person) continue;
        const name = extractName(person.imiona || person.imie, person.nazwisko);
        if (name) {
          board.push({
            name,
            position: person?.funkcjaWOrganie || person?.funkcja || 'Członek Rady Nadzorczej',
            verified: true
          });
        }
      }
    }
  } catch (e) {
    console.error('[KRS] Error extracting supervisory board:', e);
  }
  
  return board;
}

// Helper: Extract share capital from dzial1
function extractShareCapital(dzial1: any): {
  amount: number | null;
  currency: string;
  shares_total: number | null;
  share_unit_value: number | null;
  paid_up: number | null;
} {
  try {
    const kapitalSpolki = dzial1?.kapitalSpolki || dzial1?.kapital || {};
    
    // wysokoscKapitaluZakladowego is an ARRAY with history
    const wysokoscArray = kapitalSpolki?.wysokoscKapitaluZakladowego || [];
    const wysokosc = getLatestEntry(wysokoscArray);
    
    let amount: number | null = null;
    if (typeof wysokosc === 'object' && wysokosc?.wartosc) {
      amount = parseFloat(String(wysokosc.wartosc).replace(/[^\d.,]/g, '').replace(',', '.'));
    } else if (wysokosc && (typeof wysokosc === 'string' || typeof wysokosc === 'number')) {
      amount = parseFloat(String(wysokosc).replace(/[^\d.,]/g, '').replace(',', '.'));
    }
    
    const currency = wysokosc?.waluta || kapitalSpolki?.waluta || 'PLN';
    
    // iloscWszystkichUdzialow is an ARRAY
    const iloscArray = kapitalSpolki?.iloscWszystkichUdzialow || [];
    const iloscEntry = getLatestEntry(iloscArray);
    const sharesTotal = iloscEntry?.iloscWszystkichUdzialow 
      ? parseFloat(String(iloscEntry.iloscWszystkichUdzialow)) 
      : (typeof iloscEntry === 'number' || typeof iloscEntry === 'string' ? parseFloat(String(iloscEntry)) : null);
    
    // wartoscJednegoUdzialu is an ARRAY
    const wartoscArray = kapitalSpolki?.wartoscJednegoUdzialu || [];
    const wartoscEntry = getLatestEntry(wartoscArray);
    let shareUnitValue: number | null = null;
    if (typeof wartoscEntry === 'object' && wartoscEntry?.wartosc) {
      shareUnitValue = parseFloat(String(wartoscEntry.wartosc).replace(',', '.'));
    } else if (wartoscEntry) {
      shareUnitValue = parseFloat(String(wartoscEntry).replace(/[^\d.,]/g, '').replace(',', '.'));
    }
    
    // czyKapitalZostaWplacony or similar
    const paidUpArray = kapitalSpolki?.czyKapitalZostalWplacony || kapitalSpolki?.oplaconaWartosc || [];
    const paidUpEntry = getLatestEntry(paidUpArray);
    let paidUp: number | null = null;
    if (typeof paidUpEntry === 'object' && paidUpEntry?.wartosc) {
      paidUp = parseFloat(String(paidUpEntry.wartosc).replace(',', '.'));
    }
    
    console.log(`[KRS] Share capital extracted: ${amount} ${currency}, shares: ${sharesTotal}, unit: ${shareUnitValue}`);
    
    return { amount, currency, shares_total: sharesTotal, share_unit_value: shareUnitValue, paid_up: paidUp };
  } catch (e) {
    console.error('[KRS] Error extracting share capital:', e);
    return { amount: null, currency: 'PLN', shares_total: null, share_unit_value: null, paid_up: null };
  }
}

// Helper: Extract branches from dzial1 - using jednostkiTerenoweOddzialy
function extractBranches(dzial1: any): Array<{ name: string; address: string; city: string; postal_code?: string }> {
  const branches: Array<{ name: string; address: string; city: string; postal_code?: string }> = [];
  
  try {
    // KRS API uses "jednostkiTerenoweOddzialy" not "oddzialy"
    const jednostki = dzial1?.jednostkiTerenoweOddzialy || dzial1?.oddzialy || {};
    
    console.log('[KRS] DEBUG - jednostkiTerenoweOddzialy:', JSON.stringify({
      exists: !!dzial1?.jednostkiTerenoweOddzialy,
      type: typeof jednostki,
      isArray: Array.isArray(jednostki),
      keys: typeof jednostki === 'object' ? Object.keys(jednostki || {}).slice(0, 10) : [],
      firstItem: Array.isArray(jednostki) && jednostki.length > 0 ? jednostki[0] : null
    }, null, 2).substring(0, 2000));
    
    // Helper to extract address from adres object (after getLatestEntry)
    const buildAddress = (adres: any) => {
      if (!adres) return '';
      const parts = [];
      if (adres.ulica) {
        let street = adres.ulica;
        if (adres.nrDomu) street += ` ${adres.nrDomu}`;
        if (adres.nrLokalu) street += `/${adres.nrLokalu}`;
        parts.push(street);
      }
      return parts.join(' ').trim();
    };
    
    // Helper to process a branch entry - each branch has fields that are ARRAYS with history
    const processBranch = (branchItem: any) => {
      if (!branchItem || typeof branchItem !== 'object') return;
      
      // Get latest name - nazwa is an ARRAY with history
      const nazwaArray = branchItem?.nazwa || [];
      const latestNazwa = getLatestEntry(Array.isArray(nazwaArray) ? nazwaArray : [nazwaArray]);
      // nazwa can be { nazwa: "...", nrWpisuWprow: "..." } or just string
      const name = typeof latestNazwa === 'string' ? latestNazwa : (latestNazwa?.nazwa || '');
      
      // Skip deleted entries
      if (!name || (latestNazwa?.nrWpisuWykr && !latestNazwa?.nazwa)) return;
      
      // Get latest address - adres is an ARRAY with history
      const adresArray = branchItem?.adres || [];
      const latestAdres = getLatestEntry(Array.isArray(adresArray) ? adresArray : [adresArray]);
      
      // Get latest seat (for city) - siedziba is an ARRAY with history
      const siedzibaArray = branchItem?.siedziba || [];
      const latestSiedziba = getLatestEntry(Array.isArray(siedzibaArray) ? siedzibaArray : [siedzibaArray]);
      
      // Build address string
      const address = buildAddress(latestAdres);
      const city = latestAdres?.miejscowosc || latestSiedziba?.miejscowosc || '';
      const postal_code = latestAdres?.kodPocztowy || '';
      
      if (name && typeof name === 'string') {
        branches.push({
          name,
          address,
          city,
          postal_code: postal_code || undefined
        });
      }
    };
    
    // jednostkiTerenoweOddzialy is typically an array with numeric keys
    if (Array.isArray(jednostki)) {
      for (const branchItem of jednostki) {
        processBranch(branchItem);
      }
    } else if (typeof jednostki === 'object' && jednostki !== null) {
      // Fallback: iterate over object values (numeric keys like "0", "1", "2"...)
      for (const key of Object.keys(jednostki)) {
        if (!isNaN(Number(key))) {
          processBranch(jednostki[key]);
        }
      }
    }
    
    console.log(`[KRS] Branches extracted: ${branches.length}`);
  } catch (e) {
    console.error('[KRS] Error extracting branches:', e);
  }
  
  return branches;
}

// Helper: Extract registry court info from odpis - uses naglowekP.wpis[0] for first registration
function extractRegistryCourt(krsData: any): { name: string | null; department: string | null; entry_number: string | null; first_entry_date: string | null } {
  try {
    const naglowekP = krsData?.odpis?.naglowekP || {};
    const naglowek = krsData?.odpis?.naglowek || {};
    
    // First entry (registration) contains court info
    const wpisy = naglowekP?.wpis || [];
    const firstEntry = Array.isArray(wpisy) && wpisy.length > 0 ? wpisy[0] : null;
    
    console.log('[KRS] DEBUG - Court extraction:', JSON.stringify({
      naglowekP_exists: !!naglowekP,
      wpisy_count: Array.isArray(wpisy) ? wpisy.length : 0,
      firstEntry: firstEntry,
    }, null, 2).substring(0, 1500));
    
    // Extract court name from first entry
    let courtName = firstEntry?.oznaczenieSaduDokonujacegoWpisu || 
                    naglowekP?.sad || naglowek?.sad || null;
    
    // Clean up court name - extract just the court and department
    let department: string | null = null;
    if (courtName) {
      // Pattern: "SĄD REJONOWY  W KATOWICACH WYDZIAŁ, GOSPODARCZY KRAJOWEGO REJESTRU SĄDOWEGO"
      const match = courtName.match(/SĄD\s+REJONOWY\s+(?:[\w-]+\s+)?(?:W|DLA)\s+([A-ZĄĆĘŁŃÓŚŻŹ-]+)/i);
      if (match) {
        // Extract department info
        const deptMatch = courtName.match(/WYDZIAŁ\s+([IVXLCDM]+)\s+GOSPODARCZY/i);
        department = deptMatch ? `Wydział ${deptMatch[1]} Gospodarczy KRS` : 'Wydział Gospodarczy KRS';
      }
    }
    
    // Entry number from first registration
    const entryNumber = firstEntry?.numerWpisu?.toString() || naglowekP?.numerWpisu || null;
    
    // First entry date
    const firstEntryDate = firstEntry?.dataWpisu || null;
    
    console.log(`[KRS] Court extracted: ${courtName}, dept=${department}, entry=${entryNumber}, firstDate=${firstEntryDate}`);
    
    return {
      name: courtName,
      department: department,
      entry_number: entryNumber,
      first_entry_date: firstEntryDate
    };
  } catch (e) {
    console.error('[KRS] Error extracting court:', e);
    return { name: null, department: null, entry_number: null, first_entry_date: null };
  }
}

// Helper: Extract all important dates
function extractDates(dzial1: any, dzial6: any): {
  registration: string | null;
  first_entry: string | null;
  deletion: string | null;
  suspension_start: string | null;
  suspension_end: string | null;
} {
  try {
    // DEBUG: Log date sources
    console.log('[KRS] DEBUG - Date sources:', JSON.stringify({
      dzial6_keys: Object.keys(dzial6 || {}),
      dzial6_informacje: dzial6?.informacjeOWpisachDoRejestruIWykresleniach,
      dzial6_wpisy: dzial6?.wpisy,
      dzial1_danePodmiotu_keys: Object.keys(dzial1?.danePodmiotu || {}),
      dzial1_dataRozpoczecia: dzial1?.danePodmiotu?.dataRozpoczeciaDzialalnosci,
    }, null, 2).substring(0, 2000));
    
    const statusInfo = dzial6?.informacjeOWpisachDoRejestruIWykresleniach || dzial6?.wpisy || dzial6 || {};
    
    // dataRozpoczeciaDzialalnosci is an ARRAY with history
    const dataRozpArray = dzial1?.danePodmiotu?.dataRozpoczeciaDzialalnosci || [];
    const dataRozp = getLatestEntry(dataRozpArray);
    const registration = typeof dataRozp === 'string' ? dataRozp : (dataRozp?.dataRozpoczeciaDzialalnosci || dataRozp?.data || null);
    
    // Try multiple paths for first entry date
    const firstEntry = statusInfo?.dataWpisuDoRejestru || 
                       statusInfo?.dataPierwszegoWpisu ||
                       dzial6?.dataPierwszegoWpisu ||
                       null;
    
    console.log(`[KRS] Dates extracted: registration=${registration}, firstEntry=${firstEntry}`);
    
    return {
      registration,
      first_entry: firstEntry,
      deletion: statusInfo?.dataWykreslenia || null,
      suspension_start: statusInfo?.dataZawieszenia || null,
      suspension_end: statusInfo?.dataWznowienia || null
    };
  } catch (e) {
    console.error('[KRS] Error extracting dates:', e);
    return { registration: null, first_entry: null, deletion: null, suspension_start: null, suspension_end: null };
  }
}

// Helper: Extract representation rules (sposób reprezentacji)
function extractRepresentationRules(dzial2: any): string | null {
  try {
    const reprezentacja = dzial2?.reprezentacja;
    if (!reprezentacja) return null;
    
    // Handle array format (OdpisPelny) - get latest entry
    const repr = Array.isArray(reprezentacja) 
      ? getLatestEntry(reprezentacja) 
      : reprezentacja;
    
    if (!repr) return null;
    
    // sposobReprezentacji might itself be an object or array with history
    let sposobRepr = repr?.sposobReprezentacji || repr?.opis;
    
    // If sposobReprezentacji is also an array, get latest
    if (Array.isArray(sposobRepr)) {
      const latestSposob = getLatestEntry(sposobRepr);
      sposobRepr = latestSposob?.sposobReprezentacji || latestSposob?.opis || latestSposob;
    }
    
    // If it's an object with sposobReprezentacji key, extract it recursively
    if (typeof sposobRepr === 'object' && sposobRepr !== null) {
      sposobRepr = sposobRepr?.sposobReprezentacji || sposobRepr?.opis || null;
    }
    
    // Final check: must be string
    return typeof sposobRepr === 'string' ? sposobRepr : null;
  } catch (e) {
    console.error('[KRS] Error extracting representation rules:', e);
    return null;
  }
}

// Helper: Extract correspondence address
function extractCorrespondenceAddress(dzial1: any): {
  address: string | null;
  city: string | null;
  postal_code: string | null;
} {
  try {
    const siedzibaIAdres = dzial1?.siedzibaIAdres || {};
    const adresKoresp = siedzibaIAdres?.adresDoKorespondencji || siedzibaIAdres?.adresKorespondencyjny || [];
    const latest = getLatestEntry(adresKoresp);
    
    if (!latest) return { address: null, city: null, postal_code: null };
    
    let addressParts = '';
    if (latest?.ulica) {
      addressParts = latest.ulica;
      if (latest?.nrDomu) addressParts += ` ${latest.nrDomu}`;
      if (latest?.nrLokalu) addressParts += `/${latest.nrLokalu}`;
    }
    
    return {
      address: addressParts || null,
      city: latest?.miejscowosc || null,
      postal_code: latest?.kodPocztowy || null
    };
  } catch (e) {
    return { address: null, city: null, postal_code: null };
  }
}

// Helper: Extract related entities (podmioty powiązane) from dzial3 AND dzial4
// Also returns capital group info from consolidated report filings
function extractRelatedEntities(dzial3: any, dzial4: any): {
  entities: Array<{ name: string; krs?: string; nip?: string; type: 'parent' | 'subsidiary' | 'affiliated' }>;
  has_capital_group: boolean;
  capital_group_reports_count: number;
} {
  const entities: Array<{ name: string; krs?: string; nip?: string; type: 'parent' | 'subsidiary' | 'affiliated' }> = [];
  let hasCapitalGroup = false;
  let reportsCount = 0;
  
  try {
    // DEBUG: Log both dzial3 and dzial4 structures for related entities
    console.log('[KRS] DEBUG - Related entities sources:', JSON.stringify({
      dzial3_keys: Object.keys(dzial3 || {}),
      dzial3_sprawozdaniaGrupyKapitalowej_exists: !!dzial3?.sprawozdaniaGrupyKapitalowej,
      dzial3_sprawozdaniaGrupyKapitalowej: dzial3?.sprawozdaniaGrupyKapitalowej,
      dzial4_keys: Object.keys(dzial4 || {}),
      dzial4_sample: dzial4
    }, null, 2).substring(0, 3000));
    
    // ============================================
    // Check for capital group indicators in dzial3
    // wzmiankaOZlozeniuSkonsolidowanegoRocznegoSprawozdaniaFinansowego = consolidated financial reports
    // ============================================
    const sprawozdaniaGrupy = dzial3?.sprawozdaniaGrupyKapitalowej || {};
    const wzmiankaSkonsolidowane = sprawozdaniaGrupy?.wzmiankaOZlozeniuSkonsolidowanegoRocznegoSprawozdaniaFinansowego || [];
    const skonsolidowaneArray = Array.isArray(wzmiankaSkonsolidowane) ? wzmiankaSkonsolidowane : (wzmiankaSkonsolidowane ? [wzmiankaSkonsolidowane] : []);
    
    if (skonsolidowaneArray.length > 0) {
      hasCapitalGroup = true;
      reportsCount = skonsolidowaneArray.length;
      console.log(`[KRS] Company has ${reportsCount} consolidated group reports - is part of capital group`);
    }
    
    // ============================================
    // SOURCE 1: Dzial3 - Sprawozdania grupy kapitałowej
    // This is where capital group affiliations are stored in OdpisPelny
    // ============================================
    const sprawozdaniaArray = Array.isArray(sprawozdaniaGrupy) ? [sprawozdaniaGrupy] : (typeof sprawozdaniaGrupy === 'object' && sprawozdaniaGrupy !== null ? [sprawozdaniaGrupy] : []);
    
    console.log(`[KRS] DEBUG - sprawozdaniaGrupyKapitalowej entries: ${sprawozdaniaArray.length}`);
    
    for (const sprawozdanie of sprawozdaniaArray) {
      if (!sprawozdanie) continue;
      const latest = getLatestEntry(Array.isArray(sprawozdanie) ? sprawozdanie : [sprawozdanie]);
      
      // The structure might have: jednostkaDominujacaLubOrganizujaca, jednostkiZalezne, jednostkiPowiazane
      
      // Jednostka dominująca (parent organizing the group)
      const dominujaca = latest?.jednostkaDominujacaLubOrganizujaca || latest?.jednostkaDominujaca || latest?.organizator || [];
      const dominujacaArray = Array.isArray(dominujaca) ? dominujaca : (dominujaca ? [dominujaca] : []);
      
      for (const d of dominujacaArray) {
        if (!d) continue;
        const entry = getLatestEntry(Array.isArray(d) ? d : [d]);
        const nazwa = entry?.firma || entry?.nazwa || entry?.nazwaPodmiotu || (typeof entry === 'string' ? entry : null);
        if (nazwa) {
          entities.push({
            name: nazwa,
            krs: entry?.krs || entry?.numerKRS,
            nip: entry?.nip,
            type: 'parent'
          });
          console.log(`[KRS] Found parent from dzial3.sprawozdaniaGrupyKapitalowej: ${nazwa}`);
        }
      }
      
      // Jednostki zależne (subsidiaries in the group)
      const zalezne = latest?.jednostkiZalezne || latest?.podmioty || [];
      const zalezneArray = Array.isArray(zalezne) ? zalezne : (zalezne ? [zalezne] : []);
      
      for (const z of zalezneArray) {
        if (!z) continue;
        const entry = getLatestEntry(Array.isArray(z) ? z : [z]);
        const nazwa = entry?.firma || entry?.nazwa || entry?.nazwaPodmiotu || (typeof entry === 'string' ? entry : null);
        if (nazwa) {
          entities.push({
            name: nazwa,
            krs: entry?.krs || entry?.numerKRS,
            nip: entry?.nip,
            type: 'subsidiary'
          });
          console.log(`[KRS] Found subsidiary from dzial3.sprawozdaniaGrupyKapitalowej: ${nazwa}`);
        }
      }
      
      // Jednostki powiązane (affiliated entities)
      const powiazane = latest?.jednostkiPowiazane || [];
      const powiazaneArray = Array.isArray(powiazane) ? powiazane : (powiazane ? [powiazane] : []);
      
      for (const p of powiazaneArray) {
        if (!p) continue;
        const entry = getLatestEntry(Array.isArray(p) ? p : [p]);
        const nazwa = entry?.firma || entry?.nazwa || entry?.nazwaPodmiotu || (typeof entry === 'string' ? entry : null);
        if (nazwa) {
          entities.push({
            name: nazwa,
            krs: entry?.krs || entry?.numerKRS,
            nip: entry?.nip,
            type: 'affiliated'
          });
          console.log(`[KRS] Found affiliated from dzial3.sprawozdaniaGrupyKapitalowej: ${nazwa}`);
        }
      }
      
      // Direct opis/informacja might contain company names in some formats
      if (latest?.opis && typeof latest.opis === 'string' && entities.length === 0) {
        // Store as an info note - we might parse it later
        console.log(`[KRS] sprawozdaniaGrupyKapitalowej has opis but no structured data: ${latest.opis.substring(0, 200)}`);
      }
    }
    
    // ============================================
    // SOURCE 2: Dzial4 - Additional affiliated entities (fallback/legacy)
    // ============================================
    
    // Podmioty dominujące (parent companies) from dzial4
    const dominujace = dzial4?.informacjaOPodmiotachDominujacych || dzial4?.podmiotyDominujace || [];
    const dominujaceArray = Array.isArray(dominujace) ? dominujace : (dominujace ? [dominujace] : []);
    
    for (const d of dominujaceArray) {
      if (!d) continue;
      const latest = getLatestEntry(Array.isArray(d) ? d : [d]);
      const nazwa = latest?.firma || latest?.nazwa || latest?.nazwaPodmiotu;
      if (nazwa && !entities.find(e => e.name === nazwa)) {
        entities.push({
          name: nazwa,
          krs: latest?.krs || latest?.numerKRS,
          nip: latest?.nip,
          type: 'parent'
        });
        console.log(`[KRS] Found parent from dzial4: ${nazwa}`);
      }
    }
    
    // Podmioty zależne (subsidiary companies) from dzial4
    const zalezne = dzial4?.informacjaOPodmiotachZaleznych || dzial4?.podmiotyZalezne || [];
    const zalezneArray = Array.isArray(zalezne) ? zalezne : (zalezne ? [zalezne] : []);
    
    for (const z of zalezneArray) {
      if (!z) continue;
      const latest = getLatestEntry(Array.isArray(z) ? z : [z]);
      const nazwa = latest?.firma || latest?.nazwa || latest?.nazwaPodmiotu;
      if (nazwa && !entities.find(e => e.name === nazwa)) {
        entities.push({
          name: nazwa,
          krs: latest?.krs || latest?.numerKRS,
          nip: latest?.nip,
          type: 'subsidiary'
        });
        console.log(`[KRS] Found subsidiary from dzial4: ${nazwa}`);
      }
    }
    
    console.log(`[KRS] Related entities total: ${entities.length} found, has_capital_group: ${hasCapitalGroup}, reports: ${reportsCount}`);
  } catch (e) {
    console.error('[KRS] Error extracting related entities:', e);
  }
  
  return {
    entities,
    has_capital_group: hasCapitalGroup,
    capital_group_reports_count: reportsCount
  };
}

// Helper: Extract court mentions and proceedings from dzial6
function extractCourtMentions(dzial6: any): Array<{
  type: 'bankruptcy' | 'restructuring' | 'transformation' | 'liquidation' | 'other';
  date?: string;
  description: string;
  warning_level: 'critical' | 'warning' | 'info';
}> {
  const mentions: Array<{
    type: 'bankruptcy' | 'restructuring' | 'transformation' | 'liquidation' | 'other';
    date?: string;
    description: string;
    warning_level: 'critical' | 'warning' | 'info';
  }> = [];
  
  try {
    // Postępowania upadłościowe
    const upadlosciowe = dzial6?.postepowaniaUpadlosciowe || dzial6?.informacjeOUpadlosci || [];
    const upadArray = Array.isArray(upadlosciowe) ? upadlosciowe : (upadlosciowe ? [upadlosciowe] : []);
    
    for (const u of upadArray) {
      if (!u) continue;
      const latest = getLatestEntry(Array.isArray(u) ? u : [u]);
      mentions.push({
        type: 'bankruptcy',
        date: latest?.dataOrzeczenia || latest?.data,
        description: latest?.opis || latest?.informacja || 'Postępowanie upadłościowe',
        warning_level: 'critical'
      });
    }
    
    // Postępowania restrukturyzacyjne
    const restrukturyzacyjne = dzial6?.postepowaniaRestrukturyzacyjne || dzial6?.informacjeORestrukturyzacji || [];
    const restrArray = Array.isArray(restrukturyzacyjne) ? restrukturyzacyjne : (restrukturyzacyjne ? [restrukturyzacyjne] : []);
    
    for (const r of restrArray) {
      if (!r) continue;
      const latest = getLatestEntry(Array.isArray(r) ? r : [r]);
      mentions.push({
        type: 'restructuring',
        date: latest?.dataOrzeczenia || latest?.data,
        description: latest?.opis || latest?.informacja || 'Postępowanie restrukturyzacyjne',
        warning_level: 'critical'
      });
    }
    
    // Przekształcenia
    const przeksztalcenia = dzial6?.informacjeOPrzeksztalceniu || dzial6?.przeksztalcenia || [];
    const przekArray = Array.isArray(przeksztalcenia) ? przeksztalcenia : (przeksztalcenia ? [przeksztalcenia] : []);
    
    for (const p of przekArray) {
      if (!p) continue;
      const latest = getLatestEntry(Array.isArray(p) ? p : [p]);
      mentions.push({
        type: 'transformation',
        date: latest?.data || latest?.dataWpisu,
        description: latest?.opis || latest?.informacja || 'Przekształcenie spółki',
        warning_level: 'info'
      });
    }
    
    // Likwidacja
    const likwidacja = dzial6?.informacjaOOtwarciuLikwidacji || dzial6?.likwidacja || [];
    const likwArray = Array.isArray(likwidacja) ? likwidacja : (likwidacja ? [likwidacja] : []);
    
    for (const l of likwArray) {
      if (!l) continue;
      const latest = getLatestEntry(Array.isArray(l) ? l : [l]);
      mentions.push({
        type: 'liquidation',
        date: latest?.dataOtwarcia || latest?.data,
        description: latest?.opis || 'Otwarcie likwidacji',
        warning_level: 'warning'
      });
    }
    
    // Inne wzmianki
    const wzmianki = dzial6?.wzmianki || [];
    const wzmankiArray = Array.isArray(wzmianki) ? wzmianki : (wzmianki ? [wzmianki] : []);
    
    for (const w of wzmankiArray) {
      if (!w) continue;
      const latest = getLatestEntry(Array.isArray(w) ? w : [w]);
      if (latest?.opis || latest?.tresc) {
        mentions.push({
          type: 'other',
          date: latest?.data,
          description: latest?.opis || latest?.tresc,
          warning_level: 'info'
        });
      }
    }
    
    console.log(`[KRS] Court mentions: ${mentions.length} found`);
  } catch (e) {
    console.error('[KRS] Error extracting court mentions:', e);
  }
  
  return mentions;
}

// Helper: Extract case signatures (sygnatury spraw)
function extractCaseSignatures(dzial6: any, naglowek: any): string[] {
  const signatures: string[] = [];
  
  try {
    // From naglowek
    if (naglowek?.sygnatura) signatures.push(naglowek.sygnatura);
    if (naglowek?.sygnaturaAkt) signatures.push(naglowek.sygnaturaAkt);
    
    // From dzial6 sygnatury
    const sygnatury = dzial6?.sygnatury || dzial6?.sygnaturySpraw || [];
    const sygArray = Array.isArray(sygnatury) ? sygnatury : (sygnatury ? [sygnatury] : []);
    
    for (const s of sygArray) {
      if (typeof s === 'string' && s) signatures.push(s);
      else if (s?.sygnatura) signatures.push(s.sygnatura);
    }
  } catch (e) {
    console.error('[KRS] Error extracting case signatures:', e);
  }
  
  return [...new Set(signatures)]; // Remove duplicates
}

// Parse KRS response - using OdpisPelny structure (same as fetch-krs-data)
function parseKRSResponse(krsData: any): any {
  try {
    const dzial1 = krsData?.odpis?.dane?.dzial1;
    const dzial2 = krsData?.odpis?.dane?.dzial2;
    const dzial3 = krsData?.odpis?.dane?.dzial3;
    const dzial6 = krsData?.odpis?.dane?.dzial6;
    const naglowek = krsData?.odpis?.naglowekP || krsData?.odpis?.naglowek || {};
    
    // DEBUG: Log TOP-LEVEL structure to find court data
    console.log('[KRS] DEBUG - Top level structure:', JSON.stringify({
      krsData_keys: Object.keys(krsData || {}),
      odpis_keys: Object.keys(krsData?.odpis || {}),
      naglowekP: krsData?.odpis?.naglowekP,
      naglowek: krsData?.odpis?.naglowek,
      // Check dzial6 for dates
      dzial6_keys: Object.keys(dzial6 || {}),
      dzial6_sample: dzial6,
    }, null, 2).substring(0, 4000));
    
    // Also log dzial1 keys for debugging
    console.log('[KRS] DEBUG - dzial1 structure:', JSON.stringify({
      dzial1_keys: Object.keys(dzial1 || {}),
      dzial1_danePodmiotu_keys: Object.keys(dzial1?.danePodmiotu || {}),
      dzial1_informacjeORejestracji: dzial1?.informacjeORejestracji,
      dzial1_rejestracja: dzial1?.rejestracja,
    }, null, 2).substring(0, 2000));
    
    if (!dzial1) {
      console.log(`[KRS] No dzial1 in response`);
      return null;
    }
    
    // Handle company name - nazwa is an ARRAY with history in OdpisPelny
    const nazwaArray = dzial1?.danePodmiotu?.nazwa;
    const latestNazwa = getLatestEntry(nazwaArray);
    let companyName: string | null = null;
    if (typeof latestNazwa === 'string') {
      companyName = latestNazwa;
    } else if (latestNazwa?.nazwa) {
      companyName = latestNazwa.nazwa;
    } else if (latestNazwa && typeof latestNazwa === 'object') {
      // Try to get any string value from the object
      const values = Object.values(latestNazwa).filter(v => typeof v === 'string' && v.length > 3);
      companyName = values[0] as string || null;
    }
    
    // NIP and REGON - identyfikatory is an ARRAY with history entries
    const identyfikatoryArray = dzial1?.danePodmiotu?.identyfikatory || [];
    const latestIdent = getLatestEntry(identyfikatoryArray);
    // The actual NIP/REGON are nested inside "identyfikatory" key
    const identyfikatory = latestIdent?.identyfikatory || latestIdent || {};
    
    const nip = identyfikatory?.nip || 
                naglowek?.nip ||
                null;
    
    // Extract and normalize REGON (14-digit -> 9-digit)
    const rawRegon = identyfikatory?.regon || naglowek?.regon || null;
    const regon = normalizeRegon(rawRegon);
    
    console.log(`[KRS] Identyfikatory: ${Array.isArray(identyfikatoryArray) ? identyfikatoryArray.length : 0} entries, NIP=${nip}, REGON=${regon} (raw: ${rawRegon})`);
    
    // Address - adres is an ARRAY with history entries
    const siedzibaIAdres = dzial1?.siedzibaIAdres || {};
    const adresArray = siedzibaIAdres?.adres || [];
    const siedzibaAdres = getLatestEntry(adresArray) || {};
    
    const siedzibaArray = siedzibaIAdres?.siedziba || [];
    const siedziba = getLatestEntry(siedzibaArray) || {};
    
    console.log('[KRS] DEBUG - Address data:', JSON.stringify({
      adres_count: Array.isArray(adresArray) ? adresArray.length : 0,
      siedziba_count: Array.isArray(siedzibaArray) ? siedzibaArray.length : 0,
      siedzibaAdres,
      siedziba
    }, null, 2).substring(0, 1500));
    
    // Build address from the latest entry
    let addressParts = '';
    const addrSource = siedzibaAdres?.ulica ? siedzibaAdres : siedziba;
    if (addrSource?.ulica) {
      addressParts = addrSource.ulica;
      if (addrSource?.nrDomu) addressParts += ` ${addrSource.nrDomu}`;
      if (addrSource?.nrLokalu) addressParts += `/${addrSource.nrLokalu}`;
    }
    
    const city = siedzibaAdres?.miejscowosc || siedziba?.miejscowosc || null;
    const postalCode = siedzibaAdres?.kodPocztowy || siedziba?.kodPocztowy || null;
    
    const addressFull = [addressParts, postalCode, city].filter(Boolean).join(', ');
    
    // Contact info from KRS - these are also ARRAYS
    const emailArray = siedzibaIAdres?.adresPocztyElektronicznej || [];
    const emailEntry = getLatestEntry(emailArray);
    const email = emailEntry?.adresPocztyElektronicznej || emailEntry?.email || emailEntry || null;
    
    const phoneArray = siedzibaIAdres?.numerTelefonu || [];
    const phoneEntry = getLatestEntry(phoneArray);
    const phone = phoneEntry?.numerTelefonu || phoneEntry?.telefon || phoneEntry || null;
    
    const wwwArray = siedzibaIAdres?.adresStronyInternetowej || [];
    const wwwEntry = getLatestEntry(wwwArray);
    const websiteKrs = wwwEntry?.adresStronyInternetowej || wwwEntry?.www || wwwEntry || null;
    
    console.log(`[KRS] Contact: email=${email}, phone=${phone}, www=${websiteKrs}`);
    
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
    
    // PKD codes from dzial3 - with descriptions (extended paths for various KRS API formats)
    // DEBUG: Log dzial3 structure
    console.log('[KRS] DEBUG - dzial3 structure:', JSON.stringify({
      dzial3_exists: !!dzial3,
      dzial3_keys: Object.keys(dzial3 || {}),
      dzial3_type: typeof dzial3,
      przedmiotDzialalnosci_exists: !!dzial3?.przedmiotDzialalnosci,
      przedmiotDzialalnosci_keys: Object.keys(dzial3?.przedmiotDzialalnosci || {}),
      przedmiotDzialalnosciGospodarczej_exists: !!dzial3?.przedmiotDzialalnosciGospodarczej,
      raw_dzial3: dzial3
    }, null, 2).substring(0, 3000));
    
    // Try multiple paths for przedmiotDzialalnosci (different KRS API versions)
    const przedmiotDzialalnosci = dzial3?.przedmiotDzialalnosci || 
                                   dzial3?.przedmiotDzialalnosciGospodarczej ||
                                   dzial3?.pkd ||
                                   dzial3 || {};
    
    // Try multiple paths for PKD przeważająca (main activity)
    const pkdPrzewazajaca = przedmiotDzialalnosci?.przedmiotPrzewazajacejDzialalnosci || 
                             przedmiotDzialalnosci?.pkdPrzewazajaca ||
                             przedmiotDzialalnosci?.dzialalnosPrzewazajaca ||
                             przedmiotDzialalnosci?.glowna ||
                             przedmiotDzialalnosci?.przewazajaca ||
                             [];
    
    // Try multiple paths for PKD pozostała (secondary activities)
    const pkdPozostala = przedmiotDzialalnosci?.przedmiotPozostalejDzialalnosci || 
                          przedmiotDzialalnosci?.pkdPozostala ||
                          przedmiotDzialalnosci?.pozostala ||
                          przedmiotDzialalnosci?.dzialalnosci ||
                          [];
    
    console.log('[KRS] DEBUG - PKD extraction:', JSON.stringify({
      pkdPrzewazajaca_type: typeof pkdPrzewazajaca,
      pkdPrzewazajaca_isArray: Array.isArray(pkdPrzewazajaca),
      pkdPrzewazajaca_length: Array.isArray(pkdPrzewazajaca) ? pkdPrzewazajaca.length : 'not array',
      pkdPrzewazajaca_sample: Array.isArray(pkdPrzewazajaca) ? pkdPrzewazajaca[0] : pkdPrzewazajaca,
      pkdPozostala_length: Array.isArray(pkdPozostala) ? pkdPozostala.length : 'not array',
    }, null, 2));
    
    const pkdPrzewazajacaArray = Array.isArray(pkdPrzewazajaca) ? pkdPrzewazajaca : (pkdPrzewazajaca ? [pkdPrzewazajaca] : []);
    const pkdPozostalaArray = Array.isArray(pkdPozostala) ? pkdPozostala : (pkdPozostala ? [pkdPozostala] : []);
    
    // Helper to extract PKD code and description from various formats
    // PKD entries in OdpisPelny are nested: przedmiotPrzewazajacejDzialalnosci[0].pozycja[0]
    const extractPkdEntry = (p: any, isMain: boolean) => {
      if (!p) return null;
      
      // Get latest entry if it's history array (filter out deleted entries)
      const entry = getLatestEntry(Array.isArray(p) ? p : [p]);
      if (!entry) return null;
      
      // PKD entries are NESTED in "pozycja" array in OdpisPelny format
      // Structure: { pozycja: [{ kodDzial, kodKlasa, kodPodklasa, opis }] }
      const pozycje = entry?.pozycja || [];
      if (Array.isArray(pozycje) && pozycje.length > 0) {
        // Get the latest pozycja entry (filter out deleted)
        const activePozycje = pozycje.filter((poz: any) => !poz.nrWpisuWykr);
        const pozycja = activePozycje.length > 0 ? activePozycje[activePozycje.length - 1] : pozycje[pozycje.length - 1];
        
        if (pozycja) {
          // Build PKD code from parts: kodDzial.kodKlasa.kodPodklasa (e.g., "45.11.Z")
          const codeParts = [pozycja.kodDzial, pozycja.kodKlasa, pozycja.kodPodklasa].filter(Boolean);
          const code = codeParts.length > 0 ? codeParts.join('.') : (pozycja.kod || pozycja.pkd);
          
          if (code) {
            console.log(`[KRS] Extracted PKD from pozycja: ${code} - ${pozycja.opis}`);
            return {
              code: code,
              description: pozycja.opis || pozycja.nazwa || pozycja.opisDzialalnosci || null,
              is_main: isMain
            };
          }
        }
      }
      
      // Fallback: direct structure (older API format)
      const code = entry?.kodDzial || entry?.kod || entry?.pkd || entry?.kodPKD ||
                   (typeof entry === 'string' ? entry : null);
      
      if (!code) return null;
      
      return {
        code: code,
        description: entry?.opis || entry?.nazwa || entry?.opisDzialalnosci || null,
        is_main: isMain
      };
    };
    
    // Extract PKD with descriptions
    const pkdWithDescriptions = [
      ...pkdPrzewazajacaArray.map((p: any) => extractPkdEntry(p, true)).filter(Boolean),
      ...pkdPozostalaArray.map((p: any) => extractPkdEntry(p, false)).filter(Boolean)
    ] as Array<{ code: string; description: string | null; is_main: boolean }>;
    
    console.log(`[KRS] PKD extracted: ${pkdWithDescriptions.length} codes, main=${pkdWithDescriptions.find(p => p.is_main)?.code}`);
    
    // Backward compatible flat list
    const pkdCodes = pkdWithDescriptions.map(p => p.code);
    const pkdMain = pkdWithDescriptions.find(p => p.is_main)?.code || pkdCodes[0] || null;
    const pkdMainDescription = pkdWithDescriptions.find(p => p.is_main)?.description || null;
    
    // Get industry from main PKD
    const industry = getIndustryFromPKD(pkdMain);
    
    // Extract additional data using helper functions
    const shareholders = extractShareholders(dzial2);
    const procurators = extractProcurators(dzial2);
    const supervisoryBoard = extractSupervisoryBoard(dzial2);
    const shareCapital = extractShareCapital(dzial1);
    const branches = extractBranches(dzial1);
    const registryCourt = extractRegistryCourt(krsData);
    const dates = extractDates(dzial1, dzial6);
    
    // NEW: Extract additional KRS OdpisPełny data
    const representationRules = extractRepresentationRules(dzial2);
    const correspondenceAddress = extractCorrespondenceAddress(dzial1);
    const dzial4 = krsData?.odpis?.dane?.dzial4;
    const relatedEntitiesResult = extractRelatedEntities(dzial3, dzial4);
    const courtMentions = extractCourtMentions(dzial6);
    const caseSignatures = extractCaseSignatures(dzial6, naglowek);
    
    console.log(`[KRS] Parsed: name=${companyName}, nip=${nip}, regon=${regon}, management=${management.length}, shareholders=${shareholders.length}, procurators=${procurators.length}, supervisoryBoard=${supervisoryBoard.length}, relatedEntities=${relatedEntitiesResult.entities.length}, courtMentions=${courtMentions.length}`);
    
    return {
      // Basic data
      name_official: companyName,
      nip: nip,
      regon: regon,
      address_registered: addressFull || null,
      address: addressParts || null,
      city: city,
      postal_code: postalCode,
      registration_date: dates.registration,
      legal_form: legalForm,
      legal_form_name: formaPrawna,
      pkd_codes: pkdCodes,
      pkd_with_descriptions: pkdWithDescriptions,
      pkd_main: pkdMain,
      pkd_main_description: pkdMainDescription,
      industry: industry,
      status,
      
      // People
      management,
      shareholders,
      procurators,
      supervisory_board: supervisoryBoard,
      
      // NEW: Representation rules
      representation_rules: representationRules,
      
      // Capital
      share_capital: shareCapital.amount,
      share_capital_currency: shareCapital.currency,
      shares_total: shareCapital.shares_total,
      share_unit_value: shareCapital.share_unit_value,
      capital_paid_up: shareCapital.paid_up,
      
      // Registry court
      registry_court: registryCourt.name,
      registry_department: registryCourt.department,
      entry_number: registryCourt.entry_number,
      
      // Branches
      branches,
      
      // Dates - merge with first_entry from court extraction
      dates: {
        ...dates,
        first_entry: registryCourt.first_entry_date || dates.first_entry,
      },
      
      // NEW: Correspondence address
      correspondence_address: correspondenceAddress.address,
      correspondence_city: correspondenceAddress.city,
      correspondence_postal_code: correspondenceAddress.postal_code,
      
      // NEW: Related entities (podmioty powiązane)
      related_entities: relatedEntitiesResult.entities,
      has_capital_group: relatedEntitiesResult.has_capital_group,
      capital_group_reports_count: relatedEntitiesResult.capital_group_reports_count,
      
      // NEW: Court mentions and proceedings
      court_mentions: courtMentions,
      
      // NEW: Case signatures
      case_signatures: caseSignatures,
      
      // Contact from KRS
      email_krs: email,
      phone_krs: phone,
      website_krs: websiteKrs,
      
      // Meta
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
    const { 
      company_id, 
      company_name, 
      email_domain, 
      existing_krs, 
      existing_nip,
      preview_only,      // NEW: If true, don't save to DB, just return candidate
      confirmed_krs,     // NEW: User-confirmed KRS to use directly
      confirmed_nip      // NEW: User-confirmed NIP to use directly
    } = await req.json();

    // For confirmed mode, we just need company_id
    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-confirmed mode, need company_name or email_domain
    if (!confirmed_krs && !confirmed_nip && !company_name && !email_domain) {
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

    console.log(`[Stage 1] Starting verification for: ${company_name || email_domain || `confirmed KRS=${confirmed_krs}`}`);

    // If we have confirmed KRS/NIP, skip Perplexity search and go directly to registry
    let krs = confirmed_krs || existing_krs;
    let nip = confirmed_nip || existing_nip;

    let sourceData: any = {
      verified_at: new Date().toISOString(),
      company_name_input: company_name,
      email_domain_input: email_domain
    };

    // Step 1: Perplexity basic search if we don't have KRS/NIP
    if (perplexityKey && !krs && !nip && company_name) {
      const searchResult = await searchBasicInfo(company_name || email_domain, perplexityKey);
      if (searchResult.krs) krs = searchResult.krs;
      if (searchResult.nip) nip = searchResult.nip;
      if (searchResult.regon) sourceData.regon = searchResult.regon;
      if (searchResult.info) sourceData.perplexity_info = searchResult.info;
      // Extract address and website from Perplexity as fallback
      if (searchResult.address) sourceData.address_perplexity = searchResult.address;
      if (searchResult.city) sourceData.city_perplexity = searchResult.city;
      if (searchResult.postal_code) sourceData.postal_code_perplexity = searchResult.postal_code;
      if (searchResult.website) sourceData.website_perplexity = searchResult.website;
      console.log(`[Stage 1] Perplexity found: KRS=${krs}, NIP=${nip}, city=${searchResult.city}, website=${searchResult.website}`);
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

    // ALWAYS use Perplexity data as fallback for missing fields (even when KRS/CEIDG provided partial data)
    if (sourceData.address_perplexity && !sourceData.address) {
      sourceData.address = sourceData.address_perplexity;
      console.log(`[Stage 1] Using Perplexity address as fallback: ${sourceData.address}`);
    }
    if (sourceData.city_perplexity && !sourceData.city) {
      sourceData.city = sourceData.city_perplexity;
      console.log(`[Stage 1] Using Perplexity city as fallback: ${sourceData.city}`);
    }
    if (sourceData.postal_code_perplexity && !sourceData.postal_code) {
      sourceData.postal_code = sourceData.postal_code_perplexity;
    }
    
    // Website fallback: Perplexity first, then email domain
    if (!sourceData.website) {
      if (sourceData.website_perplexity) {
        sourceData.website = sourceData.website_perplexity;
        console.log(`[Stage 1] Using Perplexity website: ${sourceData.website}`);
      } else if (email_domain) {
        sourceData.website = `https://${email_domain}`;
        console.log(`[Stage 1] Using email domain as website fallback: ${sourceData.website}`);
      }
    }
    
    // If no API data, mark as perplexity_only
    if (!sourceData.source) {
      sourceData.source = 'perplexity_only';
      sourceData.confidence = 'low';
    }

    // Add the found IDs
    if (krs && !sourceData.krs) sourceData.krs = krs;
    if (nip && !sourceData.nip) sourceData.nip = nip;

    // =====================================================
    // NEW: PREVIEW MODE - Return candidate without saving
    // =====================================================
    if (preview_only) {
      // Determine if confirmation is needed:
      // - No KRS/NIP was provided by user (existing_krs/existing_nip)
      // - Data was found via Perplexity search (not confirmed by user)
      // ALWAYS require confirmation when we had to search for the company
      const needsConfirmation = !existing_krs && !existing_nip && !confirmed_krs && !confirmed_nip;
      
      console.log(`[Stage 1] Preview mode - needs_confirmation: ${needsConfirmation}, existing_krs: ${existing_krs}, existing_nip: ${existing_nip}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          candidate: sourceData,
          needs_confirmation: needsConfirmation
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // SAVE MODE - Continue with database update
    // =====================================================
    
    // Update status to processing
    await supabase
      .from('companies')
      .update({ source_data_status: 'processing' })
      .eq('id', company_id);

    // Check if website would conflict with another company (unique constraint)
    let websiteToUpdate = sourceData.website;
    if (websiteToUpdate) {
      // Get current company's tenant_id
      const { data: currentCompany } = await supabase
        .from('companies')
        .select('tenant_id, website')
        .eq('id', company_id)
        .single();
      
      if (currentCompany) {
        // Check if another company already has this website
        const { data: existingWithWebsite } = await supabase
          .from('companies')
          .select('id')
          .eq('tenant_id', currentCompany.tenant_id)
          .eq('website', websiteToUpdate)
          .neq('id', company_id)
          .maybeSingle();
        
        if (existingWithWebsite) {
          console.log(`[Stage 1] Website ${websiteToUpdate} already used by company ${existingWithWebsite.id}, skipping website update`);
          websiteToUpdate = null; // Don't update website if it would conflict
        }
      }
    }

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
        // Update official company name from verified KRS data
        ...(sourceData.name_official && sourceData.source === 'krs_api' 
          ? { name: sourceData.name_official } : {}),
        // New fields from Stage 1
        ...(sourceData.registration_date ? { registration_date: sourceData.registration_date } : {}),
        ...(sourceData.pkd_codes?.length ? { pkd_codes: sourceData.pkd_codes } : {}),
        ...(sourceData.status ? { company_status: sourceData.status } : {}),
        ...(websiteToUpdate ? { website: websiteToUpdate } : {}),
        ...(sourceData.industry ? { industry: sourceData.industry } : {}),
      })
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 1] Database update error:', updateError);
      throw updateError;
    }
    
    // NEW: Save related entities to capital_group_members table
    if (sourceData.related_entities?.length > 0) {
      // Get tenant_id from company
      const { data: companyData } = await supabase
        .from('companies')
        .select('tenant_id')
        .eq('id', company_id)
        .single();
      
      if (companyData?.tenant_id) {
        console.log(`[Stage 1] Saving ${sourceData.related_entities.length} related entities to capital_group_members`);
        
        for (const entity of sourceData.related_entities) {
          // Map KRS type to our relationship_type
          const relationshipType = entity.type === 'parent' ? 'parent' 
            : entity.type === 'subsidiary' ? 'subsidiary' 
            : 'affiliate';
          
          // Check if company with NIP/KRS exists in database
          let memberCompanyId = null;
          if (entity.nip || entity.krs) {
            let query = supabase
              .from('companies')
              .select('id')
              .eq('tenant_id', companyData.tenant_id)
              .neq('id', company_id); // Don't link to self
            
            if (entity.nip) {
              query = query.eq('nip', entity.nip);
            } else if (entity.krs) {
              query = query.eq('krs', entity.krs);
            }
            
            const { data: existingCompany } = await query.maybeSingle();
            memberCompanyId = existingCompany?.id || null;
          }
          
          // Upsert to capital_group_members
          const { error: insertError } = await supabase
            .from('capital_group_members')
            .upsert({
              tenant_id: companyData.tenant_id,
              parent_company_id: company_id,
              member_company_id: memberCompanyId,
              external_name: entity.name,
              external_krs: entity.krs || null,
              external_nip: entity.nip || null,
              relationship_type: relationshipType,
              data_source: 'krs',
              krs_verified: true
            }, {
              onConflict: entity.nip ? 'parent_company_id,external_nip' : 
                          entity.krs ? 'parent_company_id,external_krs' : 
                          undefined
            });
          
          if (insertError) {
            console.error(`[Stage 1] Error saving capital group member ${entity.name}:`, insertError);
          } else {
            console.log(`[Stage 1] Saved capital group member: ${entity.name} (${relationshipType})`);
          }
        }
      }
    }
    
    console.log(`[Stage 1] Completed successfully for ${company_name || email_domain || `confirmed KRS=${confirmed_krs}`}`);

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

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
    const prokura = dzial2?.prokura || dzial2?.prokurent || [];
    const prokuraArray = Array.isArray(prokura) ? prokura : [prokura];
    
    for (const p of prokuraArray) {
      if (!p) continue;
      
      // Get prokura type
      const rodzaj = p?.rodzajProkury || p?.rodzaj || 'Prokura';
      
      // Extract persons from sklad
      const sklad = p?.sklad || p?.prokurenci || [];
      const skladArray = Array.isArray(sklad) ? sklad : [sklad];
      
      for (const person of skladArray) {
        if (!person) continue;
        const name = extractName(person.imiona || person.imie, person.nazwisko);
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

// Helper: Extract branches from dzial1
function extractBranches(dzial1: any): Array<{ name: string; address: string; city: string; postal_code?: string }> {
  const branches: Array<{ name: string; address: string; city: string; postal_code?: string }> = [];
  
  try {
    const oddzialy = dzial1?.oddzialy || [];
    const oddzialyArray = Array.isArray(oddzialy) ? oddzialy : [oddzialy];
    
    for (const o of oddzialyArray) {
      if (!o) continue;
      const adres = o?.adres || o?.adresSiedziby || {};
      
      branches.push({
        name: o?.nazwaOddzialu || o?.nazwa || 'Oddział',
        address: adres?.ulica ? `${adres.ulica} ${adres.nrDomu || ''}${adres.nrLokalu ? '/' + adres.nrLokalu : ''}`.trim() : '',
        city: adres?.miejscowosc || '',
        postal_code: adres?.kodPocztowy
      });
    }
  } catch (e) {
    console.error('[KRS] Error extracting branches:', e);
  }
  
  return branches;
}

// Helper: Extract registry court info from odpis
function extractRegistryCourt(krsData: any): { name: string | null; department: string | null; entry_number: string | null } {
  try {
    const naglowek = krsData?.odpis?.naglowek || krsData?.odpis?.sad || {};
    return {
      name: naglowek?.sad || naglowek?.nazwaSadu || null,
      department: naglowek?.wydzial || naglowek?.nazwaWydzialu || null,
      entry_number: naglowek?.numerWpisu || null
    };
  } catch (e) {
    return { name: null, department: null, entry_number: null };
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
    const statusInfo = dzial6?.informacjeOWpisachDoRejestruIWykresleniach || dzial6 || {};
    return {
      registration: dzial1?.danePodmiotu?.dataRozpoczeciaDzialalnosci || null,
      first_entry: statusInfo?.dataWpisuDoRejestru || statusInfo?.dataPierwszegoWpisu || null,
      deletion: statusInfo?.dataWykreslenia || null,
      suspension_start: statusInfo?.dataZawieszenia || null,
      suspension_end: statusInfo?.dataWznowienia || null
    };
  } catch (e) {
    return { registration: null, first_entry: null, deletion: null, suspension_start: null, suspension_end: null };
  }
}

// Parse KRS response - using OdpisPelny structure (same as fetch-krs-data)
function parseKRSResponse(krsData: any): any {
  try {
    const dzial1 = krsData?.odpis?.dane?.dzial1;
    const dzial2 = krsData?.odpis?.dane?.dzial2;
    const dzial3 = krsData?.odpis?.dane?.dzial3;
    const dzial6 = krsData?.odpis?.dane?.dzial6;
    const naglowek = krsData?.odpis?.naglowek || {};
    
    // DEBUG: Log raw structure to find correct paths
    console.log('[KRS] DEBUG - Raw structure sample:', JSON.stringify({
      naglowek_keys: Object.keys(naglowek),
      naglowek: naglowek,
      dzial1_danePodmiotu_keys: Object.keys(dzial1?.danePodmiotu || {}),
      dzial1_danePodmiotu_identyfikatory: dzial1?.danePodmiotu?.identyfikatory,
      dzial1_kapitalSpolki: dzial1?.kapitalSpolki,
      dzial1_siedzibaIAdres: dzial1?.siedzibaIAdres,
      dzial2_keys: Object.keys(dzial2 || {}),
      dzial2_wspolnicy: dzial2?.wspolnicy,
    }, null, 2).substring(0, 3000));
    
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
    
    const regon = identyfikatory?.regon || 
                  naglowek?.regon ||
                  null;
    
    console.log(`[KRS] Identyfikatory: ${Array.isArray(identyfikatoryArray) ? identyfikatoryArray.length : 0} entries, NIP=${nip}, REGON=${regon}`);
    
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
    
    // Extract additional data using helper functions
    const shareholders = extractShareholders(dzial2);
    const procurators = extractProcurators(dzial2);
    const supervisoryBoard = extractSupervisoryBoard(dzial2);
    const shareCapital = extractShareCapital(dzial1);
    const branches = extractBranches(dzial1);
    const registryCourt = extractRegistryCourt(krsData);
    const dates = extractDates(dzial1, dzial6);
    
    console.log(`[KRS] Parsed: name=${companyName}, nip=${nip}, regon=${regon}, management=${management.length}, shareholders=${shareholders.length}, procurators=${procurators.length}, supervisoryBoard=${supervisoryBoard.length}`);
    
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
      pkd_main: pkdCodes[0] || null,
      status,
      
      // People
      management,
      shareholders,
      procurators,
      supervisory_board: supervisoryBoard,
      
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
      
      // Dates
      dates,
      
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
        ...(sourceData.website ? { website: sourceData.website } : {}),
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

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KRSPerson {
  imiona: string;
  nazwisko: string;
  funkcja?: string;
}

interface KRSResponse {
  odpis?: {
    dane?: {
      dzial1?: {
        danePodmiotu?: {
          nazwa?: string | Array<{ nazwa?: string }> | { nazwa?: string };
          formaPrawna?: string | { nazwa?: string; wartość?: string };
        };
        siedzibaIAdres?: {
          siedziba?: {
            kraj?: string;
            wojewodztwo?: string;
            powiat?: string;
            gmina?: string;
            miejscowosc?: string;
          };
          adres?: {
            ulica?: string;
            nrDomu?: string;
            nrLokalu?: string;
            miejscowosc?: string;
            kodPocztowy?: string;
            poczta?: string;
            kraj?: string;
          };
        };
      };
      dzial2?: {
        reprezentacja?: any; // Flexible - KRS API returns different structures
        wspolnicy?: {
          wspolnikSpZoo?: Array<{
            wspólnik?: {
              osoba?: KRSPerson;
            };
          }>;
        };
      };
      napiData?: {
        nip?: string;
        regon?: string;
      };
    };
  };
}

interface CreatedContact {
  id: string;
  full_name: string;
  position: string;
  is_new: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAuthClient = createClient(supabaseUrl, supabaseKey);

    // Sprint 01 — wymagaj JWT
    const auth = await verifyAuth(req, supabaseAuthClient);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    const { krs, companyId, ownerContactId } = await req.json();

    if (!krs) {
      return new Response(
        JSON.stringify({ error: 'Numer KRS jest wymagany' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize KRS to 10 digits
    const krsNormalized = krs.toString().padStart(10, '0');

    // Get auth context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's tenant
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get director or assistant
    const { data: director } = await supabase
      .from('directors')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    const tenantId = director?.tenant_id;
    if (!tenantId) {
      const { data: assistant } = await supabase
        .from('assistants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!assistant?.tenant_id) {
        return new Response(
          JSON.stringify({ error: 'Nie znaleziono tenant' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const finalTenantId = tenantId || (await supabase.from('assistants').select('tenant_id').eq('user_id', user.id).single()).data?.tenant_id;

    // Fetch data from KRS API - using OdpisPelny for complete data
    console.log(`Fetching KRS data for: ${krsNormalized}`);
    const krsUrl = `https://api-krs.ms.gov.pl/api/krs/OdpisPelny/${krsNormalized}?rejestr=P&format=json`;
    
    let krsResponse = await fetch(krsUrl);
    if (!krsResponse.ok) {
      // Try with rejestr=S (associations/foundations)
      const krsUrlS = `https://api-krs.ms.gov.pl/api/krs/OdpisPelny/${krsNormalized}?rejestr=S&format=json`;
      krsResponse = await fetch(krsUrlS);
      
      if (!krsResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Nie znaleziono firmy w KRS' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const krsData: KRSResponse = await krsResponse.json();
    console.log('KRS API Response received');

    // Extract company data
    const dzial1 = krsData.odpis?.dane?.dzial1;
    const dzial2 = krsData.odpis?.dane?.dzial2;
    const napiData = krsData.odpis?.dane?.napiData;

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
    console.log(`[fetch-krs-data] Parsed company name: ${companyName}`);

    // Handle legal form - can be string or object with nazwa/wartość
    const rawFormaPrawna = dzial1?.danePodmiotu?.formaPrawna;
    let formaPrawna: string | null = null;
    if (typeof rawFormaPrawna === 'string') {
      formaPrawna = rawFormaPrawna;
    } else if (rawFormaPrawna && typeof rawFormaPrawna === 'object') {
      formaPrawna = (rawFormaPrawna as any).nazwa || (rawFormaPrawna as any).wartość || null;
    }

    const siedzibaAdres = dzial1?.siedzibaIAdres?.adres;
    const siedziba = dzial1?.siedzibaIAdres?.siedziba;

    // Build address
    let address = '';
    if (siedzibaAdres?.ulica) {
      address = siedzibaAdres.ulica;
      if (siedzibaAdres.nrDomu) address += ` ${siedzibaAdres.nrDomu}`;
      if (siedzibaAdres.nrLokalu) address += `/${siedzibaAdres.nrLokalu}`;
    }

    const city = siedzibaAdres?.miejscowosc || siedziba?.miejscowosc || null;
    const postalCode = siedzibaAdres?.kodPocztowy || null;
    const nip = napiData?.nip || null;
    const regon = napiData?.regon || null;

    // Map legal form
    const legalFormMap: Record<string, string> = {
      'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ': 'sp_z_oo',
      'SPÓŁKA AKCYJNA': 'sa',
      'SPÓŁKA JAWNA': 'spolka_jawna',
      'SPÓŁKA PARTNERSKA': 'spolka_partnerska',
      'SPÓŁKA KOMANDYTOWA': 'spolka_komandytowa',
      'SPÓŁKA KOMANDYTOWO-AKCYJNA': 'spolka_komandytowa',
    };
    const legalForm = formaPrawna ? (legalFormMap[formaPrawna.toUpperCase()] || 'other') : null;

    // Extract management persons - handle multiple KRS API response structures
    const managementPersons: Array<{ name: string; position: string }> = [];
    
    const reprezentacja = dzial2?.reprezentacja;
    console.log('[fetch-krs-data] dzial2.reprezentacja structure:', JSON.stringify(reprezentacja, null, 2)?.substring(0, 1000));
    
    // Helper function to extract name from nested KRS structure
    const extractName = (imionaField: any, nazwiskoField: any): string | null => {
      let firstName = '';
      let lastName = '';
      
      // imiona can be: string, array [{imiona: {imie: "X", imieDrugie: "Y"}}], or {imie: "X"}
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
      
      // nazwisko can be: string, array [{nazwisko: {nazwiskoICzlon: "X"}}], or {nazwiskoICzlon: "X"}
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
    };
    
    // Helper to extract position/function
    const extractPosition = (funkcjaField: any): string => {
      if (typeof funkcjaField === 'string') return funkcjaField;
      if (Array.isArray(funkcjaField) && funkcjaField.length > 0) {
        const first = funkcjaField[0];
        return first?.funkcjaWOrganie || first?.funkcja || 'Członek Zarządu';
      }
      if (funkcjaField?.funkcjaWOrganie) return funkcjaField.funkcjaWOrganie;
      return 'Członek Zarządu';
    };
    
    // Collect all possible sources of management data
    const skladSources: any[] = [];
    
    if (reprezentacja?.sklad) skladSources.push(reprezentacja.sklad);
    if (reprezentacja?.skladOrganu) skladSources.push(reprezentacja.skladOrganu);
    if (reprezentacja?.organReprezentacji?.sklad) skladSources.push(reprezentacja.organReprezentacji.sklad);
    
    // If reprezentacja is an array (some KRS responses - OdpisPelny format)
    if (Array.isArray(reprezentacja)) {
      for (const rep of reprezentacja) {
        if (rep.sklad) skladSources.push(rep.sklad);
        if (rep.skladOrganu) skladSources.push(rep.skladOrganu);
      }
    }
    
    console.log(`[fetch-krs-data] Found ${skladSources.length} potential management sources`);
    
    for (const sklad of skladSources) {
      if (Array.isArray(sklad)) {
        for (const personEntry of sklad) {
          // Each personEntry may have imiona, nazwisko, funkcjaWOrganie directly
          const fullName = extractName(personEntry.imiona, personEntry.nazwisko);
          if (fullName) {
            const position = extractPosition(personEntry.funkcjaWOrganie || personEntry.funkcja);
            managementPersons.push({ name: fullName, position });
          }
          
          // Or it may have nested sklad/osoby
          const nestedPersons = personEntry.sklad || personEntry.osoby || [];
          if (Array.isArray(nestedPersons)) {
            for (const nested of nestedPersons) {
              const nestedName = extractName(nested.imiona, nested.nazwisko);
              if (nestedName) {
                const nestedPosition = extractPosition(nested.funkcjaWOrganie || nested.funkcja);
                managementPersons.push({ name: nestedName, position: nestedPosition });
              }
            }
          }
        }
      }
    }
    
    console.log(`[fetch-krs-data] Extracted ${managementPersons.length} management persons:`, JSON.stringify(managementPersons))

    // Extract partners (wspólnicy)
    const partners: Array<{ name: string; position: string }> = [];
    const wspolnicy = dzial2?.wspolnicy?.wspolnikSpZoo;
    if (Array.isArray(wspolnicy)) {
      for (const w of wspolnicy) {
        const osoba = w.wspólnik?.osoba;
        if (osoba?.imiona && osoba?.nazwisko) {
          partners.push({
            name: `${osoba.imiona} ${osoba.nazwisko}`,
            position: 'Wspólnik',
          });
        }
      }
    }

    // Combine all persons from KRS
    const allKrsPersons = [...managementPersons, ...partners];
    console.log(`Found ${allKrsPersons.length} persons in KRS`);

    // Update company data if companyId provided
    if (companyId) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (nip) updateData.nip = nip;
      if (regon) updateData.regon = regon;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (postalCode) updateData.postal_code = postalCode;
      if (legalForm) updateData.legal_form = legalForm;
      if (krsNormalized) updateData.krs = krsNormalized;

      await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      console.log('Company data updated');
    }

    // Create/link contacts for KRS persons
    const createdContacts: CreatedContact[] = [];

    if (ownerContactId && allKrsPersons.length > 0) {
      for (const person of allKrsPersons) {
        // Normalize name for comparison
        const nameParts = person.name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        // Check if contact already exists
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('id, full_name')
          .eq('tenant_id', finalTenantId)
          .eq('is_active', true)
          .ilike('full_name', `%${firstName}%${lastName}%`)
          .limit(1);

        let contactId: string;
        let isNew = false;

        if (existingContacts && existingContacts.length > 0) {
          contactId = existingContacts[0].id;
          console.log(`Found existing contact: ${existingContacts[0].full_name}`);
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              full_name: person.name,
              first_name: firstName,
              last_name: lastName,
              position: `KRS - ${person.position}`,
              source: 'krs',
              tenant_id: finalTenantId,
              company_id: companyId || null,
            })
            .select('id')
            .single();

          if (contactError) {
            console.error('Error creating contact:', contactError);
            continue;
          }

          contactId = newContact.id;
          isNew = true;
          console.log(`Created new contact: ${person.name}`);
        }

        // Check if connection already exists (in either direction)
        const { data: existingConnection } = await supabase
          .from('connections')
          .select('id')
          .eq('tenant_id', finalTenantId)
          .or(`and(contact_a_id.eq.${ownerContactId},contact_b_id.eq.${contactId}),and(contact_a_id.eq.${contactId},contact_b_id.eq.${ownerContactId})`)
          .limit(1);

        if (!existingConnection || existingConnection.length === 0) {
          // Create connection
          const { error: connectionError } = await supabase
            .from('connections')
            .insert({
              contact_a_id: ownerContactId,
              contact_b_id: contactId,
              connection_type: 'krs_associate',
              strength: 7,
              tenant_id: finalTenantId,
            });

          if (connectionError) {
            console.error('Error creating connection:', connectionError);
          } else {
            console.log(`Created connection for: ${person.name}`);
          }
        }

        createdContacts.push({
          id: contactId,
          full_name: person.name,
          position: person.position,
          is_new: isNew,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: {
          name: companyName,
          nip,
          regon,
          address,
          city,
          postal_code: postalCode,
          legal_form: legalForm,
          krs: krsNormalized,
        },
        management: managementPersons,
        partners,
        created_contacts: createdContacts,
        contacts_count: createdContacts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-krs-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Błąd podczas pobierania danych z KRS', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
          nazwa?: string;
          formaPrawna?: string;
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
        reprezentacja?: {
          sklad?: Array<{
            sklad?: KRSPerson[];
          }>;
        };
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

    // Fetch data from KRS API
    console.log(`Fetching KRS data for: ${krsNormalized}`);
    const krsUrl = `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krsNormalized}?rejestr=P&format=json`;
    
    const krsResponse = await fetch(krsUrl);
    if (!krsResponse.ok) {
      // Try with rejestr=S (associations/foundations)
      const krsUrlS = `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krsNormalized}?rejestr=S&format=json`;
      const krsResponseS = await fetch(krsUrlS);
      
      if (!krsResponseS.ok) {
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

    const companyName = dzial1?.danePodmiotu?.nazwa || null;
    const formaPrawna = dzial1?.danePodmiotu?.formaPrawna || null;
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

    // Extract management persons
    const managementPersons: Array<{ name: string; position: string }> = [];
    
    // From reprezentacja.sklad
    const reprezentacja = dzial2?.reprezentacja?.sklad;
    if (Array.isArray(reprezentacja)) {
      for (const group of reprezentacja) {
        if (Array.isArray(group.sklad)) {
          for (const person of group.sklad) {
            if (person.imiona && person.nazwisko) {
              managementPersons.push({
                name: `${person.imiona} ${person.nazwisko}`,
                position: person.funkcja || 'Członek Zarządu',
              });
            }
          }
        }
      }
    }

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

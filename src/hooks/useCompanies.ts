import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type Company = Tables<'companies'>;

// ============= POSITION RANKING FOR TOP CONTACT =============
const POSITION_PRIORITIES: Array<{ pattern: RegExp; rank: number }> = [
  { pattern: /właściciel|owner|founder|założyciel/i, rank: 10 },
  { pattern: /prezes|ceo|chief executive|dyrektor generalny/i, rank: 9 },
  { pattern: /wiceprezes|vice president|vp|zastępca prezesa/i, rank: 8 },
  { pattern: /dyrektor|director|managing|cto|cfo|coo|cmo/i, rank: 7 },
  { pattern: /manager|menedżer|kierownik|head of/i, rank: 6 },
  { pattern: /partner/i, rank: 5 },
];

export const getPositionRank = (position: string | null): number => {
  if (!position) return 0;
  for (const { pattern, rank } of POSITION_PRIORITIES) {
    if (pattern.test(position)) return rank;
  }
  return 1; // Other positions
};

// ============= COMPANY WITH TOP CONTACT =============
export interface CompanyWithTopContact {
  id: string;
  name: string;
  city: string | null;
  nip: string | null;
  website: string | null;
  industry: string | null;
  phone: string | null;
  top_contact: {
    id: string;
    full_name: string;
    position: string | null;
  } | null;
}

interface CompaniesFilters {
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useCompaniesWithContacts(filters: CompaniesFilters) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['companies_with_contacts', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return { data: [], count: 0 };

      const { page, pageSize, sortBy, sortOrder, search } = filters;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build companies query
      let query = supabase
        .from('companies')
        .select('id, name, city, nip, website, industry, phone', { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Search filter
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      query = query.range(from, to);

      const { data: companiesData, error: companiesError, count } = await query;

      if (companiesError) throw companiesError;
      if (!companiesData || companiesData.length === 0) {
        return { data: [], count: count || 0 };
      }

      // Fetch contacts for these companies
      const companyIds = companiesData.map(c => c.id);
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, full_name, position, company_id')
        .in('company_id', companyIds)
        .eq('is_active', true);

      if (contactsError) throw contactsError;

      // Group contacts by company and find top contact
      const contactsByCompany: Record<string, typeof contactsData> = {};
      for (const contact of contactsData || []) {
        if (contact.company_id) {
          if (!contactsByCompany[contact.company_id]) {
            contactsByCompany[contact.company_id] = [];
          }
          contactsByCompany[contact.company_id].push(contact);
        }
      }

      // Build final result with top contact
      const result: CompanyWithTopContact[] = companiesData.map(company => {
        const companyContacts = contactsByCompany[company.id] || [];
        
        // Find contact with highest position rank
        let topContact: { id: string; full_name: string; position: string | null } | null = null;
        let highestRank = -1;

        for (const contact of companyContacts) {
          const rank = getPositionRank(contact.position);
          if (rank > highestRank) {
            highestRank = rank;
            topContact = {
              id: contact.id,
              full_name: contact.full_name,
              position: contact.position,
            };
          }
        }

        return {
          id: company.id,
          name: company.name,
          city: company.city,
          nip: company.nip,
          website: company.website,
          industry: company.industry,
          phone: company.phone,
          top_contact: topContact,
        };
      });

      return { data: result, count: count || 0 };
    },
    enabled: !!tenantId,
  });
}

// Hook to get list of companies for filtering
export function useCompaniesList() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['companies_list', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!tenantId,
  });
}

// Hook to get companies with revenue data for ownership modal
export function useCompaniesWithRevenue() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['companies_with_revenue', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, revenue_amount, revenue_currency, revenue_year')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data as { 
        id: string; 
        name: string; 
        logo_url: string | null;
        revenue_amount: number | null;
        revenue_currency: string | null;
        revenue_year: number | null;
      }[];
    },
    enabled: !!tenantId,
  });
}

export interface CompanyContact {
  id: string;
  full_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  company_id: string | null;
}

// Helper functions for domain extraction
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 'yahoo.com', 
  'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'mail.com',
  'tlen.pl', 'op.pl', 'gazeta.pl', 'poczta.fm'
];

export const extractEmailDomain = (email: string | null): string | null => {
  if (!email) return null;
  const match = email.match(/@([^@]+)$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
  return GENERIC_EMAIL_DOMAINS.includes(domain) ? null : domain;
};

export const extractWebsiteDomain = (website: string | null): string | null => {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace('www.', '').toLowerCase();
  } catch {
    return null;
  }
};

export function useCompanyContacts(
  companyId: string | undefined, 
  excludeContactId?: string,
  emailDomain?: string | null
) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['company_contacts', companyId, excludeContactId, emailDomain],
    queryFn: async () => {
      if (!director?.tenant_id) return [];
      if (!companyId && !emailDomain) return [];

      // Build query to find contacts by company_id OR email domain
      let query = supabase
        .from('contacts')
        .select('id, full_name, position, email, phone, company_id')
        .eq('tenant_id', director.tenant_id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      // Use OR filter for company_id and email domain
      if (companyId && emailDomain) {
        query = query.or(`company_id.eq.${companyId},email.ilike.%@${emailDomain}`);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      } else if (emailDomain) {
        query = query.ilike('email', `%@${emailDomain}`);
      }

      if (excludeContactId) {
        query = query.neq('id', excludeContactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Deduplicate by contact id
      const uniqueContacts = new Map<string, CompanyContact>();
      for (const contact of data || []) {
        if (!uniqueContacts.has(contact.id)) {
          uniqueContacts.set(contact.id, contact as CompanyContact);
        }
      }
      
      return Array.from(uniqueContacts.values());
    },
    enabled: !!director?.tenant_id && (!!companyId || !!emailDomain),
  });
}

// Hook to assign contacts to company by email domain
export function useAssignContactsByDomain() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId, domain }: { companyId: string; domain: string }) => {
      if (!director?.tenant_id) throw new Error('No tenant');

      // Find contacts with matching email domain that don't have company_id
      const { data: contactsToUpdate, error: fetchError } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', director.tenant_id)
        .eq('is_active', true)
        .is('company_id', null)
        .ilike('email', `%@${domain}`);

      if (fetchError) throw fetchError;
      if (!contactsToUpdate?.length) return { updated: 0 };

      // Update all matching contacts
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ company_id: companyId })
        .in('id', contactsToUpdate.map(c => c.id));

      if (updateError) throw updateError;
      
      return { updated: contactsToUpdate.length };
    },
    onSuccess: ({ updated }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['company_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['companies_with_contacts'] });
      if (updated > 0) {
        toast.success(`Przypisano ${updated} kontaktów do firmy`);
      }
    },
    onError: (error) => {
      console.error('Error assigning contacts:', error);
      toast.error('Błąd podczas przypisywania kontaktów');
    },
  });
}
export type CompanyUpdate = TablesUpdate<'companies'>;

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyUpdate }) => {
      const { data: updated, error } = await supabase
        .from('companies')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company', data.id] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Dane firmy zostały zaktualizowane');
    },
    onError: (error) => {
      console.error('Error updating company:', error);
      toast.error('Błąd podczas aktualizacji danych firmy');
    },
  });
}

// Helper to get logo URL from website domain using Clearbit
export function getCompanyLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    const domain = url.hostname.replace('www.', '');
    return `https://logo.clearbit.com/${domain}`;
  } catch {
    return null;
  }
}

export function useRegenerateCompanyAI() {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, companyName, website, industryHint }: { 
      id: string; 
      companyName: string; 
      website?: string | null;
      industryHint?: string | null;
    }) => {
      const { data: result, error: enrichError } = await supabase.functions.invoke('enrich-company-data', {
        body: { 
          company_name: companyName,
          website: website,
          industry_hint: industryHint
        }
      });
      
      if (enrichError) throw enrichError;
      
      const enriched = result?.data || result;
      const finalWebsite = website || enriched.suggested_website || null;
      
      // Wyciągnij metadata z enrichment_metadata
      const enrichmentMeta = enriched.enrichment_metadata || {};
      
      // Oblicz confidence score (0-1) z 'high'/'medium'/'low'
      const confidenceMap: Record<string, number> = {
        high: 0.85,
        medium: 0.55,
        low: 0.25
      };
      const confidenceScore = confidenceMap[enrichmentMeta.overall_confidence as string] || 0.5;
      
      // Przygotuj data sources info
      const dataSources = {
        perplexity: {
          queries_used: enrichmentMeta.perplexity_queries_used || 0,
          queries_detail: enrichmentMeta.perplexity_queries_detail || {}
        },
        firecrawl: {
          pages_scraped: enrichmentMeta.firecrawl_stats?.successful_scrapes || 0,
          total_words: enrichmentMeta.firecrawl_stats?.total_words || 0,
          categories: enrichmentMeta.firecrawl_stats?.categories_found || []
        },
        ai_model: 'gemini-2.5-pro',
        completed_at: enrichmentMeta.completed_at || new Date().toISOString()
      };
      
      // ai_analysis jest teraz JSONB - zapisujemy cały obiekt bez stringify
      const updateData: CompanyUpdate = {
        description: enriched.description || null,
        ai_analysis: enriched, // Pełna analiza jako JSONB
        company_analysis_status: 'completed' as const,
        company_analysis_date: new Date().toISOString(),
        analysis_confidence_score: confidenceScore,
        analysis_data_sources: dataSources,
        analysis_missing_sections: enrichmentMeta.missing_sections || [],
        industry: enriched.industry || null,
        logo_url: enriched.logo_url || null,
        employee_count: enriched.employee_count?.toString() || null,
        website: finalWebsite,
        address: enriched.headquarters?.address || enriched.address || null,
        city: enriched.headquarters?.city || enriched.city || null,
        postal_code: enriched.headquarters?.postal_code || enriched.postal_code || null,
        nip: enriched.nip || null,
        regon: enriched.regon || null,
        krs: enriched.krs || null,
        updated_at: new Date().toISOString()
      };
      
      const { data: updated, error: updateError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Auto-assign contacts by domain after company is updated
      const domain = extractWebsiteDomain(finalWebsite);
      if (domain && director?.tenant_id) {
        const { data: contactsToUpdate } = await supabase
          .from('contacts')
          .select('id')
          .eq('tenant_id', director.tenant_id)
          .eq('is_active', true)
          .is('company_id', null)
          .ilike('email', `%@${domain}`);

        if (contactsToUpdate?.length) {
          await supabase
            .from('contacts')
            .update({ company_id: id })
            .in('id', contactsToUpdate.map(c => c.id));
        }
      }
      
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company', data.id] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['companies_with_contacts'] });
      toast.success('Analiza AI została wygenerowana ponownie');
    },
    onError: (error) => {
      console.error('Error regenerating company AI:', error);
      toast.error('Błąd podczas generowania analizy AI');
    },
  });
}

// ============= SCRAPE COMPANY LOGO =============
export function useScrapeLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, companyWebsite }: { companyId: string; companyWebsite: string }) => {
      const { data, error } = await supabase.functions.invoke('scrape-company-logo', {
        body: { companyId, companyWebsite },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Logo scraping failed');

      return data as { success: boolean; logo_url: string; method: string };
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies_with_contacts'] });
      toast.success('Logo zostało pobrane');
    },
    onError: (error) => {
      console.error('Error scraping logo:', error);
      toast.error('Błąd podczas pobierania logo');
    },
  });
}

// ============= DOMAIN STATS FOR BULK MERGE =============
interface DomainStat {
  domain: string;
  count: number;
  hasExistingCompany: boolean;
  existingCompanyId?: string;
  existingCompanyName?: string;
  sampleContacts: string[];
}

export function useDomainStats() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['domain_stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get all contacts without company_id
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, email, full_name, company')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('company_id', null)
        .not('email', 'is', null);

      if (error) throw error;
      if (!contacts?.length) return [];

      // Group by domain
      const domainMap = new Map<string, { contacts: typeof contacts }>();
      for (const contact of contacts) {
        const domain = extractEmailDomain(contact.email);
        if (!domain) continue;

        if (!domainMap.has(domain)) {
          domainMap.set(domain, { contacts: [] });
        }
        domainMap.get(domain)!.contacts.push(contact);
      }

      // Get all companies to check for matching websites
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, website')
        .eq('tenant_id', tenantId);

      // Get contacts that already have company_id for each domain
      const { data: assignedContacts } = await supabase
        .from('contacts')
        .select('email, company_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('company_id', 'is', null)
        .not('email', 'is', null);

      // Build domain stats
      const stats: DomainStat[] = [];
      for (const [domain, { contacts: domainContacts }] of domainMap.entries()) {
        if (domainContacts.length < 1) continue;

        let hasExistingCompany = false;
        let existingCompanyId: string | undefined;
        let existingCompanyName: string | undefined;

        // Check if company exists with matching website
        const matchingCompany = companies?.find(c => {
          const companyDomain = extractWebsiteDomain(c.website);
          return companyDomain === domain;
        });

        if (matchingCompany) {
          hasExistingCompany = true;
          existingCompanyId = matchingCompany.id;
          existingCompanyName = matchingCompany.name;
        } else {
          // Check if any contact from this domain already has company_id
          const contactWithCompany = assignedContacts?.find(c => {
            const contactDomain = extractEmailDomain(c.email);
            return contactDomain === domain;
          });

          if (contactWithCompany?.company_id) {
            const company = companies?.find(c => c.id === contactWithCompany.company_id);
            if (company) {
              hasExistingCompany = true;
              existingCompanyId = company.id;
              existingCompanyName = company.name;
            }
          }
        }

        stats.push({
          domain,
          count: domainContacts.length,
          hasExistingCompany,
          existingCompanyId,
          existingCompanyName,
          sampleContacts: domainContacts.slice(0, 3).map(c => c.full_name),
        });
      }

      // Sort by count descending
      return stats.sort((a, b) => b.count - a.count);
    },
    enabled: !!tenantId,
  });
}

// ============= BULK MERGE BY DOMAIN =============
export function useBulkMergeByDomain() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Get all contacts without company_id
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, email, company')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('company_id', null)
        .not('email', 'is', null);

      if (error) throw error;
      if (!contacts?.length) return { merged: 0, companiesCreated: 0 };

      // Group by domain
      const domainMap = new Map<string, typeof contacts>();
      for (const contact of contacts) {
        const domain = extractEmailDomain(contact.email);
        if (!domain) continue;

        if (!domainMap.has(domain)) {
          domainMap.set(domain, []);
        }
        domainMap.get(domain)!.push(contact);
      }

      // Get all companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, website')
        .eq('tenant_id', tenantId);

      // Get contacts that already have company_id
      const { data: assignedContacts } = await supabase
        .from('contacts')
        .select('email, company_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('company_id', 'is', null)
        .not('email', 'is', null);

      let totalMerged = 0;
      let companiesCreated = 0;

      for (const [domain, domainContacts] of domainMap.entries()) {
        if (domainContacts.length < 1) continue;

        let companyId: string | undefined;

        // A) Check if company exists with matching website
        const matchingCompany = companies?.find(c => {
          const companyDomain = extractWebsiteDomain(c.website);
          return companyDomain === domain;
        });

        if (matchingCompany) {
          companyId = matchingCompany.id;
        } else {
          // B) Check if any contact from this domain already has company_id
          const contactWithCompany = assignedContacts?.find(c => {
            const contactDomain = extractEmailDomain(c.email);
            return contactDomain === domain;
          });

          if (contactWithCompany?.company_id) {
            companyId = contactWithCompany.company_id;
          }
        }

        // C) Create new company if none found and >= 2 contacts
        if (!companyId && domainContacts.length >= 2) {
          const companyName = domainContacts[0].company || 
            domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
          
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({
              name: companyName,
              website: `https://${domain}`,
              tenant_id: tenantId,
            })
            .select()
            .single();

          if (!createError && newCompany) {
            companyId = newCompany.id;
            companiesCreated++;
          }
        }

        // D) Update all contacts from this domain
        if (companyId) {
          const contactIds = domainContacts.map(c => c.id);
          const { error: updateError } = await supabase
            .from('contacts')
            .update({ company_id: companyId })
            .in('id', contactIds);

          if (!updateError) {
            totalMerged += contactIds.length;
          }
        }
      }

      return { merged: totalMerged, companiesCreated };
    },
    onSuccess: ({ merged, companiesCreated }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies_list'] });
      queryClient.invalidateQueries({ queryKey: ['companies_with_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['domain_stats'] });
      toast.success(`Scalono ${merged} kontaktów. Utworzono ${companiesCreated} nowych firm.`);
    },
    onError: (error) => {
      console.error('Error in bulk merge:', error);
      toast.error('Błąd podczas scalania kontaktów');
    },
  });
}

// ============= UPDATE COMPANY REVENUE =============
export function useUpdateCompanyRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      companyName, 
      isGroup = false 
    }: { 
      companyId: string; 
      companyName: string;
      isGroup?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-company-revenue', {
        body: { 
          company_id: companyId,
          company_name: companyName,
          is_group: isGroup
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Błąd aktualizacji');
      
      return data.data;
    },
    onSuccess: (data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies_with_contacts'] });
      toast.success(
        data.revenue_amount 
          ? `Zaktualizowano przychód: ${(data.revenue_amount / 1_000_000).toFixed(1)}M PLN` 
          : 'Zaktualizowano dane finansowe'
      );
    },
    onError: (error) => {
      console.error('Error updating revenue:', error);
      toast.error('Błąd podczas aktualizacji przychodu');
    },
  });
}

// ============= REMOVE GROUP COMPANY =============
export function useRemoveGroupCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      companyNameToRemove 
    }: { 
      companyId: string; 
      companyNameToRemove: string;
    }) => {
      // Get current company data
      const { data: company, error: fetchError } = await supabase
        .from('companies')
        .select('group_companies, ai_analysis')
        .eq('id', companyId)
        .single();

      if (fetchError) throw fetchError;

      // Filter out the company to remove
      const currentGroupCompanies = (company?.group_companies || []) as { name: string }[];
      const updatedGroupCompanies = currentGroupCompanies.filter(
        (c) => c.name !== companyNameToRemove
      );

      // Also update ai_analysis if present
      let updatedAnalysis = company?.ai_analysis;
      if (updatedAnalysis && typeof updatedAnalysis === 'object' && !Array.isArray(updatedAnalysis)) {
        const analysisObj = { ...updatedAnalysis } as Record<string, unknown>;
        if (Array.isArray(analysisObj.group_companies)) {
          analysisObj.group_companies = (analysisObj.group_companies as { name: string }[]).filter(
            (c) => c.name !== companyNameToRemove
          );
        }
        updatedAnalysis = analysisObj as typeof company.ai_analysis;
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          group_companies: updatedGroupCompanies,
          ai_analysis: updatedAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (updateError) throw updateError;
      
      return { removed: companyNameToRemove };
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      toast.success('Usunięto spółkę z grupy');
    },
    onError: (error) => {
      console.error('Error removing group company:', error);
      toast.error('Błąd podczas usuwania spółki z grupy');
    },
  });
}

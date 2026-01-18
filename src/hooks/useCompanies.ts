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

export interface CompanyContact {
  id: string;
  full_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
}

export function useCompanyContacts(companyId: string | undefined, excludeContactId?: string) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['company_contacts', companyId, excludeContactId],
    queryFn: async () => {
      if (!companyId || !director?.tenant_id) return [];

      let query = supabase
        .from('contacts')
        .select('id, full_name, position, email, phone')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (excludeContactId) {
        query = query.neq('id', excludeContactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CompanyContact[];
    },
    enabled: !!companyId && !!director?.tenant_id,
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
      
      const updateData: CompanyUpdate = {
        description: enriched.description || null,
        ai_analysis: JSON.stringify({
          // Pełne dane z analizy AI
          what_company_does: enriched.what_company_does || null,
          what_company_offers: enriched.what_company_offers || null,
          what_company_seeks: enriched.what_company_seeks || null,
          main_products_services: enriched.main_products_services || [],
          target_clients: enriched.target_clients || null,
          competitive_advantage: enriched.competitive_advantage || null,
          management: enriched.management || [],
          company_type: enriched.company_type || null,
          founding_year: enriched.founding_year || null,
          recent_news: enriched.recent_news || null,
          company_culture: enriched.company_culture || null,
          services: enriched.services || [],
          collaboration_areas: enriched.collaboration_areas || [],
          confidence: enriched.confidence || 'medium',
          employee_count_estimate: enriched.employee_count_estimate || null,
          sources: enriched.sources || [],
          analyzed_at: new Date().toISOString(),
        }),
        industry: enriched.industry || null,
        logo_url: enriched.logo_url || null,
        // Wszystkie pola adresowe i rejestrowe
        website: website || enriched.suggested_website || null,
        address: enriched.address || null,
        city: enriched.city || null,
        postal_code: enriched.postal_code || null,
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
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company', data.id] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Analiza AI została wygenerowana ponownie');
    },
    onError: (error) => {
      console.error('Error regenerating company AI:', error);
      toast.error('Błąd podczas generowania analizy AI');
    },
  });
}

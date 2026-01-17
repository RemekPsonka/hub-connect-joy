import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Company = Tables<'companies'>;
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

export function useRegenerateCompanyAI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, companyName, website, industryHint }: { 
      id: string; 
      companyName: string; 
      website?: string | null;
      industryHint?: string | null;
    }) => {
      const { data: enriched, error: enrichError } = await supabase.functions.invoke('enrich-company-data', {
        body: { 
          company_name: companyName,
          website: website,
          industry_hint: industryHint
        }
      });
      
      if (enrichError) throw enrichError;
      
      const updateData: CompanyUpdate = {
        description: enriched.description,
        ai_analysis: JSON.stringify({
          services: enriched.services || [],
          collaboration_areas: enriched.collaboration_areas || []
        }),
        industry: enriched.industry || null,
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

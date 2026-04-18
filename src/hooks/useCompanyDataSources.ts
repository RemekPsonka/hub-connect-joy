import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CompanyDataSourceType =
  | 'external_api'
  | 'www'
  | 'financial_3y'
  | 'ai_analysis'
  | 'source_data_api'
  | 'other';

export interface CompanyDataSource {
  id: string;
  tenant_id: string;
  company_id: string;
  source_type: CompanyDataSourceType;
  data: Record<string, unknown>;
  status: string | null;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyDataSourcesMap = Partial<Record<CompanyDataSourceType, CompanyDataSource>>;

export function useCompanyDataSources(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-data-sources', companyId],
    queryFn: async (): Promise<CompanyDataSourcesMap> => {
      if (!companyId) return {};
      const { data, error } = await supabase
        .from('company_data_sources')
        .select('*')
        .eq('company_id', companyId);
      if (error) throw error;
      const map: CompanyDataSourcesMap = {};
      for (const row of (data ?? []) as CompanyDataSource[]) {
        map[row.source_type] = row;
      }
      return map;
    },
    enabled: !!companyId,
  });
}

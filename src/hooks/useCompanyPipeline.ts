import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PipelineStatus {
  stage1: string | null;
  stage2: string | null;
  stage3: string | null;
  stage4: string | null;
  stage5: string | null;
}

export interface PipelineData {
  sourceData: any;
  wwwData: any;
  externalData: any;
  financialData: any;
  aiAnalysis: any;
}

export interface CompanyCandidate {
  official_name?: string;
  krs?: string;
  nip?: string;
  regon?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  legal_form?: string;
  status?: string;
  registration_date?: string;
  management?: Array<{ name: string; position: string }>;
  source: 'krs_api' | 'ceidg_api' | 'perplexity_only';
  confidence?: 'verified' | 'high' | 'medium' | 'low';
}

export interface PreviewResult {
  success: boolean;
  preview: boolean;
  candidate: CompanyCandidate;
  needs_confirmation: boolean;
}

export function useCompanyPipeline(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidateCompany = () => {
    queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['contact'] }); // Refresh contact views with company data
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  // NEW: Preview source data (search without saving)
  const previewSource = useMutation({
    mutationFn: async (params: { companyName: string; emailDomain?: string; existingKrs?: string; existingNip?: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-company-source', {
        body: {
          company_id: companyId,
          company_name: params.companyName,
          email_domain: params.emailDomain,
          existing_krs: params.existingKrs,
          existing_nip: params.existingNip,
          preview_only: true, // NEW: Don't save, just return candidate
        }
      });
      if (error) throw error;
      return data as PreviewResult;
    },
    onError: (error: any) => {
      toast.error(`Błąd wyszukiwania: ${error.message}`);
    }
  });

  // NEW: Confirm and save source data with confirmed KRS/NIP
  const confirmSource = useMutation({
    mutationFn: async (params: { confirmed_krs?: string; confirmed_nip?: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-company-source', {
        body: {
          company_id: companyId,
          confirmed_krs: params.confirmed_krs,
          confirmed_nip: params.confirmed_nip,
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etap 1: Dane źródłowe potwierdzone i zapisane');
      invalidateCompany();
    },
    onError: (error: any) => {
      toast.error(`Błąd zapisu: ${error.message}`);
    }
  });

  // Stage 1: Verify source data (KRS/CEIDG/Perplexity) - original, auto-save when KRS/NIP provided
  const verifySource = useMutation({
    mutationFn: async (params: { companyName: string; emailDomain?: string; existingKrs?: string; existingNip?: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-company-source', {
        body: {
          company_id: companyId,
          company_name: params.companyName,
          email_domain: params.emailDomain,
          existing_krs: params.existingKrs,
          existing_nip: params.existingNip,
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etap 1: Dane źródłowe zweryfikowane');
      invalidateCompany();
    },
    onError: (error: any) => {
      toast.error(`Błąd weryfikacji: ${error.message}`);
    }
  });

  // Stage 2: Scan website (Firecrawl)
  const scanWebsite = useMutation({
    mutationFn: async (params: { website: string }) => {
      const { data, error } = await supabase.functions.invoke('scan-company-website', {
        body: { company_id: companyId, website: params.website }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Etap 2: Przeskanowano ${data?.pages_scanned || 0} stron`);
      invalidateCompany();
    },
    onError: (error: any) => {
      toast.error(`Błąd skanowania: ${error.message}`);
    }
  });

  // Stage 3: Analyze external (Perplexity deep)
  const analyzeExternal = useMutation({
    mutationFn: async (params: { companyName: string }) => {
      const { data, error } = await supabase.functions.invoke('analyze-company-external', {
        body: { company_id: companyId, company_name: params.companyName }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etap 3: Analiza zewnętrzna zakończona');
      invalidateCompany();
    },
    onError: (error: any) => {
      toast.error(`Błąd analizy: ${error.message}`);
    }
  });

  // Stage 4: Fetch financials
  const fetchFinancials = useMutation({
    mutationFn: async (params: { companyName: string; krs?: string }) => {
      const { data, error } = await supabase.functions.invoke('fetch-company-financials', {
        body: { company_id: companyId, company_name: params.companyName, krs: params.krs }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etap 4: Dane finansowe pobrane');
      invalidateCompany();
    },
    onError: (error: any) => {
      toast.error(`Błąd danych finansowych: ${error.message}`);
    }
  });

  // Stage 5: Synthesize profile
  const synthesizeProfile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('synthesize-company-profile', {
        body: { company_id: companyId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etap 5: Profil klienta wygenerowany');
      invalidateCompany();
    },
    onError: (error: any) => {
      toast.error(`Błąd syntezy: ${error.message}`);
    }
  });

  return {
    previewSource,
    confirmSource,
    verifySource,
    scanWebsite,
    analyzeExternal,
    fetchFinancials,
    synthesizeProfile,
    isAnyLoading: previewSource.isPending || confirmSource.isPending || verifySource.isPending || 
                  scanWebsite.isPending || analyzeExternal.isPending || fetchFinancials.isPending || 
                  synthesizeProfile.isPending
  };
}

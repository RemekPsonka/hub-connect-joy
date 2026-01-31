import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TypDzialnosci,
  RyzykoMajatkowe,
  RyzykoOC,
  RyzykoFlota,
  RyzykoSpecjalistyczne,
  RyzykoPracownicy,
  RyzykoFinansowe,
  PodpowiedzAI,
} from '@/components/insurance/types';
import type { Json } from '@/integrations/supabase/types';

interface InsuranceAssessment {
  id: string;
  company_id: string;
  tenant_id: string;
  typy_dzialalnosci: TypDzialnosci[];
  ryzyka_specyficzne_branzowe?: string[];
  ryzyko_majatkowe: RyzykoMajatkowe;
  ryzyko_oc: RyzykoOC;
  ryzyko_flota: RyzykoFlota;
  ryzyko_specjalistyczne: RyzykoSpecjalistyczne;
  ryzyko_pracownicy: RyzykoPracownicy;
  ryzyko_finansowe: RyzykoFinansowe;
  ai_analiza_kontekstu?: string;
  ai_podpowiedzi?: PodpowiedzAI[];
  ai_brief_brokerski?: string;
  created_at: string;
  updated_at: string;
}

interface SaveAssessmentData {
  typy_dzialalnosci: TypDzialnosci[];
  ryzyko_majatkowe: RyzykoMajatkowe;
  ryzyko_oc: RyzykoOC;
  ryzyko_flota: RyzykoFlota;
  ryzyko_specjalistyczne: RyzykoSpecjalistyczne;
  ryzyko_pracownicy: RyzykoPracownicy;
  ryzyko_finansowe: RyzykoFinansowe;
}

interface AIAnalysisResult {
  ai_analiza_kontekstu?: string;
  ai_podpowiedzi?: PodpowiedzAI[];
  ai_brief_brokerski?: string;
}

// Helper to safely parse JSONB
function parseJsonField<T>(field: Json | null | undefined, defaultValue: T): T {
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    return defaultValue;
  }
  return field as unknown as T;
}

export function useInsuranceRisk(companyId: string) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const queryClient = useQueryClient();

  const queryKey = ['insurance-risk', companyId];

  const { data: assessment, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_risk_assessments')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      // Parse JSONB fields with proper type casting
      return {
        id: data.id,
        company_id: data.company_id,
        tenant_id: data.tenant_id,
        typy_dzialalnosci: (data.typy_dzialalnosci || []) as TypDzialnosci[],
        ryzyko_majatkowe: parseJsonField<RyzykoMajatkowe>(data.ryzyko_majatkowe, { status: 'nie_dotyczy' }),
        ryzyko_oc: parseJsonField<RyzykoOC>(data.ryzyko_oc, { status: 'nie_dotyczy' }),
        ryzyko_flota: parseJsonField<RyzykoFlota>(data.ryzyko_flota, { status: 'nie_dotyczy' }),
        ryzyko_specjalistyczne: parseJsonField<RyzykoSpecjalistyczne>(data.ryzyko_specjalistyczne, { cyber_status: 'nie_dotyczy', do_status: 'nie_dotyczy', car_ear_status: 'nie_dotyczy' }),
        ryzyko_pracownicy: parseJsonField<RyzykoPracownicy>(data.ryzyko_pracownicy, { zycie_status: 'nie_dotyczy', zdrowie_status: 'nie_dotyczy', podroze_status: 'nie_dotyczy' }),
        ryzyko_finansowe: parseJsonField<RyzykoFinansowe>(data.ryzyko_finansowe, { gwarancje_kontraktowe_status: 'nie_dotyczy', gwarancje_celne_status: 'nie_dotyczy', kredyt_kupiecki_status: 'nie_dotyczy', ochrona_prawna_status: 'nie_dotyczy' }),
        ai_analiza_kontekstu: data.ai_analiza_kontekstu || undefined,
        ai_podpowiedzi: parseJsonField<PodpowiedzAI[]>(data.ai_podpowiedzi, []),
        ai_brief_brokerski: data.ai_brief_brokerski || undefined,
        created_at: data.created_at || '',
        updated_at: data.updated_at || '',
      } as InsuranceAssessment;
    },
    enabled: !!companyId && !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SaveAssessmentData) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      const payload = {
        company_id: companyId,
        tenant_id: tenantId,
        typy_dzialalnosci: data.typy_dzialalnosci,
        ryzyko_majatkowe: data.ryzyko_majatkowe as unknown as Json,
        ryzyko_oc: data.ryzyko_oc as unknown as Json,
        ryzyko_flota: data.ryzyko_flota as unknown as Json,
        ryzyko_specjalistyczne: data.ryzyko_specjalistyczne as unknown as Json,
        ryzyko_pracownicy: data.ryzyko_pracownicy as unknown as Json,
        ryzyko_finansowe: data.ryzyko_finansowe as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      if (assessment?.id) {
        // Update existing
        const { data: result, error } = await supabase
          .from('insurance_risk_assessments')
          .update(payload)
          .eq('id', assessment.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        // Insert new
        const { data: result, error } = await supabase
          .from('insurance_risk_assessments')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: SaveAssessmentData): Promise<AIAnalysisResult | null> => {
      // First save the data
      await saveMutation.mutateAsync(data);

      // Then call AI analysis
      const { data: result, error } = await supabase.functions.invoke('analyze-insurance-risk', {
        body: {
          company_id: companyId,
          action: 'analyze',
        },
      });

      if (error) throw error;
      return result as AIAnalysisResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const briefMutation = useMutation({
    mutationFn: async (data: SaveAssessmentData): Promise<AIAnalysisResult | null> => {
      // First save the data
      await saveMutation.mutateAsync(data);

      // Then generate brief
      const { data: result, error } = await supabase.functions.invoke('analyze-insurance-risk', {
        body: {
          company_id: companyId,
          action: 'brief',
        },
      });

      if (error) throw error;
      return result as AIAnalysisResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    assessment,
    isLoading,
    saveAssessment: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    analyzeRisk: analyzeMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
    generateBrief: briefMutation.mutateAsync,
    isGeneratingBrief: briefMutation.isPending,
  };
}

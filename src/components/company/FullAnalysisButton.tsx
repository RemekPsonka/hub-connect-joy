import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { FullAnalysisConfirmModal, type AnalysisOverrides } from './FullAnalysisConfirmModal';
import { FullAnalysisProgress, type FullAnalysisStage, type StageState } from './FullAnalysisProgress';
import type { Company } from './CompanyPipelineController';

interface FullAnalysisButtonProps {
  company: Company;
  contactEmail?: string | null;
  disabled?: boolean;
}

const initialStages: FullAnalysisStage[] = [
  { id: 'source', label: 'Dane rejestrowe (KRS/CEIDG)', state: 'pending' },
  { id: 'www', label: 'Analiza strony WWW', state: 'pending' },
  { id: 'external', label: 'Analiza zewnętrzna', state: 'pending' },
  { id: 'financials', label: 'Dane finansowe 3Y', state: 'pending' },
  { id: 'synthesis', label: 'Profil firmy AI', state: 'pending' },
];

export function FullAnalysisButton({ company, contactEmail, disabled }: FullAnalysisButtonProps) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<FullAnalysisStage[]>(initialStages);
  const [currentStage, setCurrentStage] = useState(0);

  const emailDomain = contactEmail?.split('@')[1];
  const inferredWebsite = company.website || (emailDomain ? `https://${emailDomain}` : null);

  const updateStage = useCallback((id: string, state: StageState, error?: string) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, state, error } : s));
  }, []);

  const invalidateCompany = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['company', company.id] });
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['contact'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }, [queryClient, company.id]);

  const runFullAnalysis = useCallback(async (overrides?: AnalysisOverrides) => {
    setShowConfirm(false);
    setIsRunning(true);
    setStages(initialStages);
    setCurrentStage(0);

    // Use overrides if provided, otherwise use original values
    const effectiveKrs = overrides?.krs || company.krs;
    const effectiveNip = overrides?.nip || company.nip;
    const effectiveWebsite = overrides?.website || inferredWebsite;

    try {
      // Stage 1: Verify source
      setCurrentStage(0);
      updateStage('source', 'running');
      
      const { data: sourceResult, error: sourceError } = await supabase.functions.invoke('verify-company-source', {
        body: {
          company_id: company.id,
          company_name: company.name,
          email_domain: emailDomain,
          existing_krs: effectiveKrs || undefined,
          existing_nip: effectiveNip || undefined,
        }
      });
      
      if (sourceError) {
        updateStage('source', 'failed', sourceError.message);
        throw sourceError;
      }
      updateStage('source', 'completed');
      invalidateCompany();

      // Get updated KRS from source result
      const verifiedKrs = sourceResult?.krs || effectiveKrs;

      // Stage 2: Scan website (if available)
      setCurrentStage(1);
      if (effectiveWebsite) {
        updateStage('www', 'running');
        
        const { error: wwwError } = await supabase.functions.invoke('scan-company-website', {
          body: { company_id: company.id, website: effectiveWebsite }
        });
        
        if (wwwError) {
          updateStage('www', 'failed', wwwError.message);
          // Continue despite error
        } else {
          updateStage('www', 'completed');
        }
        invalidateCompany();
      } else {
        updateStage('www', 'skipped');
      }

      // Stage 3: External analysis
      setCurrentStage(2);
      updateStage('external', 'running');
      
      const { error: externalError } = await supabase.functions.invoke('analyze-company-external', {
        body: { company_id: company.id, company_name: company.name }
      });
      
      if (externalError) {
        updateStage('external', 'failed', externalError.message);
        // Continue despite error
      } else {
        updateStage('external', 'completed');
      }
      invalidateCompany();

      // Stage 4: Financials
      setCurrentStage(3);
      updateStage('financials', 'running');
      
      const { error: financialsError } = await supabase.functions.invoke('fetch-company-financials', {
        body: { 
          company_id: company.id, 
          company_name: company.name, 
          krs: verifiedKrs 
        }
      });
      
      if (financialsError) {
        updateStage('financials', 'failed', financialsError.message);
        // Continue despite error
      } else {
        updateStage('financials', 'completed');
      }
      invalidateCompany();

      // Stage 5: Synthesize profile
      setCurrentStage(4);
      updateStage('synthesis', 'running');
      
      const { error: synthesisError } = await supabase.functions.invoke('synthesize-company-profile', {
        body: { company_id: company.id }
      });
      
      if (synthesisError) {
        updateStage('synthesis', 'failed', synthesisError.message);
        throw synthesisError;
      }
      updateStage('synthesis', 'completed');
      invalidateCompany();

      toast.success('Pełna analiza firmy AI zakończona!');
    } catch (error: any) {
      toast.error(`Błąd analizy: ${error.message}`);
      invalidateCompany(); // Still refresh to show partial results
    } finally {
      setIsRunning(false);
    }
  }, [company, emailDomain, inferredWebsite, invalidateCompany, updateStage]);

  // Show progress if running
  if (isRunning) {
    return (
      <FullAnalysisProgress
        stages={stages}
        currentStage={currentStage}
        isRunning={isRunning}
      />
    );
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => setShowConfirm(true)}
        disabled={disabled || isRunning}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Pełna analiza firmy AI
      </Button>

      <FullAnalysisConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        companyName={company.name}
        krs={company.krs}
        nip={company.nip}
        website={inferredWebsite}
        onConfirm={runFullAnalysis}
        isLoading={isRunning}
      />
    </>
  );
}

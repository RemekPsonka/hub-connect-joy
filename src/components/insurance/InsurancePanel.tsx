import { useState, useEffect, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RiskMatrixPanel } from './RiskMatrixPanel';
import { AIRiskConsultantPanel } from './AIRiskConsultantPanel';
import { useInsuranceRisk } from '@/hooks/useInsuranceRisk';
import { useInsurancePolicies } from '@/hooks/useInsurancePolicies';
import { exportInsuranceBriefToPDF } from '@/utils/exportInsuranceBrief';
import {
  DEFAULT_RYZYKO_MAJATKOWE,
  DEFAULT_RYZYKO_OC,
  DEFAULT_RYZYKO_FLOTA,
  DEFAULT_RYZYKO_SPECJALISTYCZNE,
  DEFAULT_RYZYKO_PRACOWNICY,
  DEFAULT_RYZYKO_FINANSOWE,
} from './types';
import type {
  TypDzialnosci,
  RyzykoMajatkowe,
  RyzykoOC,
  RyzykoFlota,
  RyzykoSpecjalistyczne,
  RyzykoPracownicy,
  RyzykoFinansowe,
  PodpowiedzAI,
} from './types';
import type { QuickPolicyData } from './QuickAddPolicyButton';
import type { PolicyType } from '@/components/renewal/types';

interface Company {
  id: string;
  name: string;
  nip?: string | null;
  industry?: string | null;
  revenue_amount?: number | null;
  employee_count?: string | null;
}

interface InsurancePanelProps {
  company: Company;
}

export function InsurancePanel({ company }: InsurancePanelProps) {
  const { assessment, isLoading, saveAssessment, isSaving, analyzeRisk, isAnalyzing, generateBrief, isGeneratingBrief } = useInsuranceRisk(company.id);
  const { createPolicy } = useInsurancePolicies(company.id);

  // Lokalne stany formularza
  const [operationalTypes, setOperationalTypes] = useState<TypDzialnosci[]>([]);
  const [majatek, setMajatek] = useState<RyzykoMajatkowe>(DEFAULT_RYZYKO_MAJATKOWE);
  const [oc, setOc] = useState<RyzykoOC>(DEFAULT_RYZYKO_OC);
  const [flota, setFlota] = useState<RyzykoFlota>(DEFAULT_RYZYKO_FLOTA);
  const [specjalistyczne, setSpecjalistyczne] = useState<RyzykoSpecjalistyczne>(DEFAULT_RYZYKO_SPECJALISTYCZNE);
  const [pracownicy, setPracownicy] = useState<RyzykoPracownicy>(DEFAULT_RYZYKO_PRACOWNICY);
  const [finansowe, setFinansowe] = useState<RyzykoFinansowe>(DEFAULT_RYZYKO_FINANSOWE);
  const [aiAnalysis, setAiAnalysis] = useState<string | undefined>();
  const [aiPrompts, setAiPrompts] = useState<PodpowiedzAI[] | undefined>();
  const [aiBrief, setAiBrief] = useState<string | undefined>();
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Inicjalizacja z danych z bazy
  useEffect(() => {
    if (assessment) {
      setOperationalTypes(assessment.typy_dzialalnosci || []);
      setMajatek(assessment.ryzyko_majatkowe || DEFAULT_RYZYKO_MAJATKOWE);
      setOc(assessment.ryzyko_oc || DEFAULT_RYZYKO_OC);
      setFlota(assessment.ryzyko_flota || DEFAULT_RYZYKO_FLOTA);
      setSpecjalistyczne(assessment.ryzyko_specjalistyczne || DEFAULT_RYZYKO_SPECJALISTYCZNE);
      setPracownicy(assessment.ryzyko_pracownicy || DEFAULT_RYZYKO_PRACOWNICY);
      setFinansowe(assessment.ryzyko_finansowe || DEFAULT_RYZYKO_FINANSOWE);
      setAiAnalysis(assessment.ai_analiza_kontekstu || undefined);
      setAiPrompts(assessment.ai_podpowiedzi || undefined);
      setAiBrief(assessment.ai_brief_brokerski || undefined);
    }
  }, [assessment]);

  // Śledzenie zmian
  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleOperationalTypesChange = (types: TypDzialnosci[]) => {
    setOperationalTypes(types);
    markChanged();
  };

  const handleMajatekChange = (data: RyzykoMajatkowe) => {
    setMajatek(data);
    markChanged();
  };

  const handleOcChange = (data: RyzykoOC) => {
    setOc(data);
    markChanged();
  };

  const handleFlotaChange = (data: RyzykoFlota) => {
    setFlota(data);
    markChanged();
  };

  const handleSpecjalistyczneChange = (data: RyzykoSpecjalistyczne) => {
    setSpecjalistyczne(data);
    markChanged();
  };

  const handlePracownicyChange = (data: RyzykoPracownicy) => {
    setPracownicy(data);
    markChanged();
  };

  const handleFinansoweChange = (data: RyzykoFinansowe) => {
    setFinansowe(data);
    markChanged();
  };

  const handleAddPolicy = useCallback((data: QuickPolicyData) => {
    createPolicy.mutate({
      company_id: company.id,
      policy_type: data.policy_type as PolicyType,
      policy_name: data.policy_name,
      start_date: data.start_date,
      end_date: data.end_date,
      sum_insured: data.sum_insured,
      premium: data.premium,
      is_our_policy: data.is_our_policy,
    });
  }, [company.id, createPolicy]);

  const handleSave = async () => {
    try {
      await saveAssessment({
        typy_dzialalnosci: operationalTypes,
        ryzyko_majatkowe: majatek,
        ryzyko_oc: oc,
        ryzyko_flota: flota,
        ryzyko_specjalistyczne: specjalistyczne,
        ryzyko_pracownicy: pracownicy,
        ryzyko_finansowe: finansowe,
      });
      setHasChanges(false);
      toast.success('Dane zapisane');
    } catch (error) {
      toast.error('Błąd zapisu danych');
    }
  };

  const handleAnalyze = async () => {
    try {
      const result = await analyzeRisk({
        typy_dzialalnosci: operationalTypes,
        ryzyko_majatkowe: majatek,
        ryzyko_oc: oc,
        ryzyko_flota: flota,
        ryzyko_specjalistyczne: specjalistyczne,
        ryzyko_pracownicy: pracownicy,
        ryzyko_finansowe: finansowe,
      });
      if (result) {
        setAiAnalysis(result.ai_analiza_kontekstu);
        setAiPrompts(result.ai_podpowiedzi);
      }
      toast.success('Analiza AI zakończona');
    } catch (error) {
      toast.error('Błąd analizy AI');
    }
  };

  const handleGenerateBrief = async () => {
    try {
      const result = await generateBrief({
        typy_dzialalnosci: operationalTypes,
        ryzyko_majatkowe: majatek,
        ryzyko_oc: oc,
        ryzyko_flota: flota,
        ryzyko_specjalistyczne: specjalistyczne,
        ryzyko_pracownicy: pracownicy,
        ryzyko_finansowe: finansowe,
      });
      if (result) {
        setAiBrief(result.ai_brief_brokerski);
      }
      toast.success('Brief brokerski wygenerowany');
    } catch (error) {
      toast.error('Błąd generowania briefu');
    }
  };

  const handleExportBrief = () => {
    exportInsuranceBriefToPDF({
      companyName: company.name,
      companyNip: company.nip,
      industry: company.industry,
      revenue: company.revenue_amount,
      employeeCount: company.employee_count,
      meetingDate: meetingDate || undefined,
      operationalTypes,
      majatek,
      oc,
      flota,
      specjalistyczne,
      pracownicy,
      finansowe,
      aiBrief,
    });
    toast.success('Brief PDF wygenerowany');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] min-h-[600px] flex flex-col">
      {/* Action bar */}
      <div className="flex justify-end p-2 border-b bg-muted/30">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          size="sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Zapisuję...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Zapisz
            </>
          )}
        </Button>
      </div>

      {/* Split panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
        <ResizablePanel defaultSize={65} minSize={50}>
          <RiskMatrixPanel
            companyName={company.name}
            industry={company.industry}
            revenue={company.revenue_amount}
            meetingDate={meetingDate}
            onMeetingDateChange={setMeetingDate}
            operationalTypes={operationalTypes}
            onOperationalTypesChange={handleOperationalTypesChange}
            majatek={majatek}
            oc={oc}
            flota={flota}
            specjalistyczne={specjalistyczne}
            pracownicy={pracownicy}
            finansowe={finansowe}
            onMajatekChange={handleMajatekChange}
            onOcChange={handleOcChange}
            onFlotaChange={handleFlotaChange}
            onSpecjalistyczneChange={handleSpecjalistyczneChange}
            onPracownicyChange={handlePracownicyChange}
            onFinansoweChange={handleFinansoweChange}
            companyId={company.id}
            onAddPolicy={handleAddPolicy}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={35} minSize={25}>
          <AIRiskConsultantPanel
            operationalTypes={operationalTypes}
            aiAnalysis={aiAnalysis}
            aiPrompts={aiPrompts}
            aiBrief={aiBrief}
            oc={oc}
            specjalistyczne={specjalistyczne}
            pracownicy={pracownicy}
            onAnalyze={handleAnalyze}
            onGenerateBrief={handleGenerateBrief}
            onExportBrief={handleExportBrief}
            isAnalyzing={isAnalyzing}
            isGeneratingBrief={isGeneratingBrief}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

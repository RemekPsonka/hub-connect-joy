import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Database,
  Globe,
  Search,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { SourceDataViewer } from './SourceDataViewer';
import { WebsiteDataViewer } from './WebsiteDataViewer';
import { ExternalDataViewer } from './ExternalDataViewer';
import { FinancialDataViewer } from './FinancialDataViewer';
import { ConfirmCompanyModal } from './ConfirmCompanyModal';
import { FullAnalysisButton } from './FullAnalysisButton';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Company } from './CompanyPipelineController';
import type { CompanyCandidate, PreviewResult } from '@/hooks/useCompanyPipeline';

interface SourcesTabContentProps {
  company: Company;
  contactEmail?: string | null;
  pipeline: {
    verifySource: {
      mutate: (params: { companyName: string; emailDomain?: string; existingKrs?: string; existingNip?: string }) => void;
      isPending: boolean;
    };
    previewSource: {
      mutateAsync: (params: { companyName: string; emailDomain?: string; existingKrs?: string; existingNip?: string }) => Promise<PreviewResult>;
      isPending: boolean;
    };
    confirmSource: {
      mutate: (params: { confirmed_krs?: string; confirmed_nip?: string }) => void;
      isPending: boolean;
    };
    scanWebsite: {
      mutate: (params: { website: string }) => void;
      isPending: boolean;
    };
    analyzeExternal: {
      mutate: (params: { companyName: string }) => void;
      isPending: boolean;
    };
    fetchFinancials: {
      mutate: (params: { companyName: string; krs?: string }) => void;
      isPending: boolean;
    };
    synthesizeProfile: {
      mutate: () => void;
      isPending: boolean;
    };
  };
}

type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface StageConfig {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
  status: StageStatus;
  isLoading: boolean;
  canRun: boolean;
  reason?: string;
  onRun: () => void;
  data: any;
  DataViewer?: React.ComponentType<any>;
  fetchedAt?: string | null;
}

function getStatusFromDb(status: string | null): StageStatus {
  if (!status) return 'pending';
  if (status === 'completed') return 'completed';
  if (status === 'processing' || status === 'in_progress') return 'processing';
  if (status === 'failed' || status === 'error') return 'failed';
  return 'pending';
}

function getToolLabel(stageId: string, data: any): string {
  switch (stageId) {
    case 'source':
      if (data?.source === 'krs_api') return 'API KRS';
      if (data?.source === 'ceidg_api') return 'API CEIDG';
      if (data?.source === 'perplexity') return 'Perplexity AI';
      return 'API';
    case 'www':
      return 'Firecrawl';
    case 'external':
      return 'Perplexity AI';
    case 'financials':
      if (data?.source === 'rdf') return 'RDF API';
      if (data?.source === 'perplexity') return 'Perplexity AI';
      return 'API';
    default:
      return 'AI';
  }
}

function formatFetchDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: pl });
  } catch {
    return '';
  }
}

interface StageTabContentProps {
  stage: StageConfig;
  company: Company;
  inferredWebsite?: string | null;
}

function StageTabContent({ stage, company, inferredWebsite }: StageTabContentProps) {
  const Icon = stage.icon;
  const toolLabel = getToolLabel(stage.id, stage.data);
  const fetchDate = formatFetchDate(stage.fetchedAt);

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stage.title}</span>
            </div>
            
            {stage.status === 'completed' ? (
              <>
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Dane pobrane
                </Badge>
                <Badge variant="outline">{toolLabel}</Badge>
                {fetchDate && (
                  <span className="text-xs text-muted-foreground">{fetchDate}</span>
                )}
              </>
            ) : stage.status === 'processing' || stage.isLoading ? (
              <Badge className="bg-primary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Pobieranie...
              </Badge>
            ) : stage.status === 'failed' ? (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Błąd
              </Badge>
            ) : (
              <Badge variant="secondary">Brak danych</Badge>
            )}
          </div>
          
          <Button 
            size="sm" 
            variant={stage.status === 'completed' ? 'outline' : 'default'}
            onClick={stage.onRun} 
            disabled={!stage.canRun || stage.isLoading}
          >
            {stage.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : stage.status === 'completed' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Odśwież
              </>
            ) : (
              'Uruchom'
            )}
          </Button>
        </div>
        
        {/* Info about inferred website URL */}
        {stage.id === 'www' && !company.website && inferredWebsite && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1">
            <Globe className="h-3 w-3" />
            URL wywnioskowany z domeny email: {inferredWebsite}
          </p>
        )}
        
        {/* Reason why can't run */}
        {stage.reason && !stage.canRun && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">{stage.reason}</p>
        )}
        
        {/* Data viewer */}
        {stage.data && stage.DataViewer ? (
          <stage.DataViewer 
            data={stage.id === 'source' ? { ...stage.data, _company: company } : stage.data} 
            company={stage.id === 'source' ? company : undefined} 
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{stage.description}</p>
            <p className="text-xs mt-1">Kliknij "Uruchom" aby pobrać dane</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDot({ status, isLoading }: { status: StageStatus; isLoading: boolean }) {
  if (isLoading) {
    return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
  }
  if (status === 'completed') {
    return <span className="h-2 w-2 rounded-full bg-green-500" />;
  }
  if (status === 'failed') {
    return <span className="h-2 w-2 rounded-full bg-destructive" />;
  }
  if (status === 'processing') {
    return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
  }
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />;
}

export function SourcesTabContent({ company, contactEmail, pipeline }: SourcesTabContentProps) {
  const emailDomain = contactEmail?.split('@')[1];
  
  // Infer website from email domain if company.website is missing
  const inferredWebsite = company.website || (emailDomain ? `https://${emailDomain}` : null);

  // State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [candidateData, setCandidateData] = useState<CompanyCandidate | null>(null);

  const sourceStatus = getStatusFromDb(company.source_data_status ?? null);
  const wwwStatus = getStatusFromDb(company.www_data_status ?? null);
  const externalStatus = getStatusFromDb(company.external_data_status ?? null);
  const financialStatus = getStatusFromDb(company.financial_data_status ?? null);
  const profileStatus = getStatusFromDb(company.company_analysis_status ?? null);

  const canSynthesize = sourceStatus === 'completed' && 
    (wwwStatus === 'completed' || externalStatus === 'completed');

  // Handle source verification with confirmation modal
  const handleVerifySource = async () => {
    // If we already have KRS or NIP, skip confirmation and verify directly
    if (company.krs || company.nip) {
      pipeline.verifySource.mutate({
        companyName: company.name,
        emailDomain,
        existingKrs: company.krs || undefined,
        existingNip: company.nip || undefined,
      });
      return;
    }

    // Otherwise, use preview mode to show confirmation modal
    try {
      const result = await pipeline.previewSource.mutateAsync({
        companyName: company.name,
        emailDomain,
        existingKrs: company.krs || undefined,
        existingNip: company.nip || undefined,
      });

      if (result.needs_confirmation) {
        setCandidateData(result.candidate);
        setShowConfirmModal(true);
      } else {
        // No confirmation needed, save directly
        pipeline.confirmSource.mutate({
          confirmed_krs: result.candidate.krs,
          confirmed_nip: result.candidate.nip,
        });
      }
    } catch (error) {
      console.error('Preview source error:', error);
    }
  };

  // Handle confirm from modal
  const handleConfirm = (krs?: string, nip?: string) => {
    setShowConfirmModal(false);
    pipeline.confirmSource.mutate({
      confirmed_krs: krs,
      confirmed_nip: nip,
    });
  };

  const isSourceLoading = pipeline.verifySource.isPending || pipeline.previewSource.isPending || pipeline.confirmSource.isPending;

  const stages: StageConfig[] = [
    {
      id: 'source',
      title: 'Dane rejestrowe',
      shortTitle: 'Rejestr',
      description: 'Weryfikacja w KRS/CEIDG lub przez AI',
      icon: Database,
      status: sourceStatus,
      isLoading: isSourceLoading,
      canRun: true,
      onRun: handleVerifySource,
      data: company.source_data_api as object | null,
      DataViewer: ({ data, company: comp }: any) => (
        <SourceDataViewer data={data} company={comp || company} />
      ),
      fetchedAt: company.source_data_date,
    },
    {
      id: 'www',
      title: 'Analiza strony WWW',
      shortTitle: 'WWW',
      description: 'Skanowanie strony firmowej (Firecrawl)',
      icon: Globe,
      status: wwwStatus,
      isLoading: pipeline.scanWebsite.isPending,
      canRun: !!inferredWebsite,
      reason: !inferredWebsite ? 'Brak strony WWW i domeny email' : undefined,
      onRun: () => inferredWebsite && pipeline.scanWebsite.mutate({ website: inferredWebsite }),
      data: company.www_data as object | null,
      DataViewer: WebsiteDataViewer,
      fetchedAt: (company.www_data as any)?.scanned_at || (company.www_data as any)?.scan_date || company.www_data_date,
    },
    {
      id: 'external',
      title: 'Analiza zewnętrzna',
      shortTitle: 'External',
      description: 'Wyszukiwanie informacji (Perplexity AI)',
      icon: Search,
      status: externalStatus,
      isLoading: pipeline.analyzeExternal.isPending,
      canRun: true,
      onRun: () => pipeline.analyzeExternal.mutate({ companyName: company.name }),
      data: company.external_data as object | null,
      DataViewer: ExternalDataViewer,
      fetchedAt: (company.external_data as any)?.analyzed_at || company.external_data_date,
    },
    {
      id: 'financials',
      title: 'Dane finansowe 3Y',
      shortTitle: 'Finanse',
      description: 'Pobieranie danych finansowych za 3 lata',
      icon: DollarSign,
      status: financialStatus,
      isLoading: pipeline.fetchFinancials.isPending,
      canRun: true,
      onRun: () => pipeline.fetchFinancials.mutate({
        companyName: company.name,
        krs: company.krs || undefined,
      }),
      data: company.financial_data_3y as object | null,
      DataViewer: FinancialDataViewer,
      fetchedAt: (company.financial_data_3y as any)?.fetched_at || company.financial_data_date,
    },
  ];

  // Find first tab with data, or default to 'source'
  const defaultTab = stages.find(s => s.status === 'completed')?.id || 'source';

  return (
    <div className="space-y-4">
      {/* Full Analysis Button - prominent at top */}
      <Card className="border-dashed border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Pełna Analiza Firmy AI
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Jednym kliknięciem uruchom wszystkie 5 etapów automatycznie
              </p>
            </div>
            <FullAnalysisButton 
              company={company} 
              contactEmail={contactEmail}
              disabled={pipeline.verifySource.isPending || pipeline.scanWebsite.isPending || 
                       pipeline.analyzeExternal.isPending || pipeline.fetchFinancials.isPending ||
                       pipeline.synthesizeProfile.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            lub wybierz etapy ręcznie
          </span>
        </div>
      </div>

      {/* Pipeline stages as tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          {stages.map((stage) => (
            <TabsTrigger 
              key={stage.id} 
              value={stage.id}
              className="flex items-center gap-2"
            >
              <StatusDot status={stage.status} isLoading={stage.isLoading} />
              <span className="hidden sm:inline">{stage.shortTitle}</span>
              <stage.icon className="h-4 w-4 sm:hidden" />
            </TabsTrigger>
          ))}
        </TabsList>
        
        {stages.map((stage) => (
          <TabsContent key={stage.id} value={stage.id} className="mt-4">
            <StageTabContent stage={stage} company={company} inferredWebsite={inferredWebsite} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Synthesis button - for manual triggering */}
      <Card className={profileStatus === 'completed' 
        ? 'border-primary bg-primary/5' 
        : canSynthesize 
          ? 'border-dashed border-2 border-primary/50' 
          : 'border-dashed border-2'
      }>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {pipeline.synthesizeProfile.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : profileStatus === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Profil Firmy AI</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Połączenie wszystkich źródeł w kompleksowy profil firmy
                </p>
                {!canSynthesize && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Wymaga: Dane rejestrowe + (WWW lub External)
                  </p>
                )}
              </div>
            </div>
            <Button
              size="lg"
              variant={profileStatus === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.synthesizeProfile.mutate()}
              disabled={!canSynthesize || pipeline.synthesizeProfile.isPending}
              className="shrink-0"
            >
              {pipeline.synthesizeProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {profileStatus === 'completed' ? 'Regeneruj profil' : 'Generuj profil firmy AI'}
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Postęp:</span>
            <div className="flex gap-1">
              {stages.map((s, i) => (
                <Badge 
                  key={s.id}
                  variant={s.status === 'completed' ? 'default' : 'outline'}
                  className={`text-xs ${s.status === 'completed' ? 'bg-green-500' : ''}`}
                >
                  {i + 1}
                </Badge>
              ))}
              <Badge 
                variant={profileStatus === 'completed' ? 'default' : 'outline'}
                className={`text-xs ${profileStatus === 'completed' ? 'bg-primary' : ''}`}
              >
                5
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {stages.filter(s => s.status === 'completed').length + (profileStatus === 'completed' ? 1 : 0)}/5 ukończone
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmCompanyModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        candidate={candidateData}
        companyName={company.name}
        onConfirm={handleConfirm}
        onReject={() => setShowConfirmModal(false)}
        isLoading={pipeline.confirmSource.isPending}
      />
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Database,
  Globe,
  Search,
  DollarSign,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SourceDataViewer } from './SourceDataViewer';
import { WebsiteDataViewer } from './WebsiteDataViewer';
import { ExternalDataViewer } from './ExternalDataViewer';
import { FinancialDataViewer } from './FinancialDataViewer';
import type { Company } from './CompanyPipelineController';

interface SourcesTabContentProps {
  company: Company;
  contactEmail?: string | null;
  pipeline: {
    verifySource: {
      mutate: (params: { companyName: string; emailDomain?: string; existingKrs?: string; existingNip?: string }) => void;
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
  description: string;
  icon: React.ElementType;
  status: StageStatus;
  isLoading: boolean;
  canRun: boolean;
  reason?: string;
  onRun: () => void;
  data: any;
  DataViewer?: React.ComponentType<any>;
}

function getStatusFromDb(status: string | null): StageStatus {
  if (!status) return 'pending';
  if (status === 'completed') return 'completed';
  if (status === 'processing' || status === 'in_progress') return 'processing';
  if (status === 'failed' || status === 'error') return 'failed';
  return 'pending';
}

function StatusIcon({ status, isLoading }: { status: StageStatus; isLoading: boolean }) {
  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'processing':
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function StageCard({ stage }: { stage: StageConfig }) {
  const [isOpen, setIsOpen] = useState(stage.status === 'completed');
  const Icon = stage.icon;

  return (
    <Card className={stage.status === 'completed' ? 'border-green-200 dark:border-green-900' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <StatusIcon status={stage.status} isLoading={stage.isLoading} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">{stage.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>
              {stage.reason && !stage.canRun && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{stage.reason}</p>
              )}
            </div>
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

        {/* Data preview */}
        {stage.data && stage.DataViewer && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-between">
                <span className="text-xs">
                  {isOpen ? 'Zwiń podgląd' : 'Pokaż dane'}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 pt-3 border-t">
              <stage.DataViewer data={stage.data} company={stage.id === 'source' ? stage.data._company : undefined} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export function SourcesTabContent({ company, contactEmail, pipeline }: SourcesTabContentProps) {
  // Extract email domain for pipeline
  const emailDomain = contactEmail?.split('@')[1];

  // Determine stage statuses
  const sourceStatus = getStatusFromDb(company.source_data_status);
  const wwwStatus = getStatusFromDb(company.www_data_status);
  const externalStatus = getStatusFromDb(company.external_data_status);
  const financialStatus = getStatusFromDb(company.financial_data_status);
  const profileStatus = getStatusFromDb(company.company_analysis_status);

  // Check if synthesis can run
  const canSynthesize = sourceStatus === 'completed' && 
    (wwwStatus === 'completed' || externalStatus === 'completed');

  const stages: StageConfig[] = [
    {
      id: 'source',
      title: 'Etap 1: Dane rejestrowe',
      description: 'Weryfikacja w KRS/CEIDG lub przez AI',
      icon: Database,
      status: sourceStatus,
      isLoading: pipeline.verifySource.isPending,
      canRun: true,
      onRun: () => pipeline.verifySource.mutate({
        companyName: company.name,
        emailDomain,
        existingKrs: company.krs || undefined,
        existingNip: company.nip || undefined,
      }),
      data: company.source_data_api ? { 
        ...company.source_data_api as object,
        _company: company 
      } : null,
      DataViewer: ({ data, company: comp }: any) => (
        <SourceDataViewer data={data} company={comp || company} />
      ),
    },
    {
      id: 'www',
      title: 'Etap 2: Analiza strony WWW',
      description: 'Skanowanie strony firmowej (Firecrawl)',
      icon: Globe,
      status: wwwStatus,
      isLoading: pipeline.scanWebsite.isPending,
      canRun: !!company.website,
      reason: !company.website ? 'Brak strony WWW w danych' : undefined,
      onRun: () => company.website && pipeline.scanWebsite.mutate({ website: company.website }),
      data: company.www_data as object | null,
      DataViewer: WebsiteDataViewer,
    },
    {
      id: 'external',
      title: 'Etap 3: Analiza zewnętrzna',
      description: 'Wyszukiwanie informacji (Perplexity AI)',
      icon: Search,
      status: externalStatus,
      isLoading: pipeline.analyzeExternal.isPending,
      canRun: true,
      onRun: () => pipeline.analyzeExternal.mutate({ companyName: company.name }),
      data: company.external_data as object | null,
      DataViewer: ExternalDataViewer,
    },
    {
      id: 'financials',
      title: 'Etap 4: Dane finansowe 3Y',
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
    },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline stages */}
      <div className="grid gap-4">
        {stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} />
        ))}
      </div>

      {/* Synthesis button - prominent */}
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
                <StatusIcon status={profileStatus} isLoading={pipeline.synthesizeProfile.isPending} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Etap 5: Synteza Profilu AI</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Połączenie wszystkich źródeł w kompleksowy profil firmy
                </p>
                {!canSynthesize && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Wymaga: Etap 1 (dane rejestrowe) + Etap 2 lub 3 (WWW lub Perplexity)
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
              {profileStatus === 'completed' ? 'Regeneruj profil' : 'Generuj profil AI'}
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Postęp:</span>
            <div className="flex gap-1">
              {stages.map((s) => (
                <Badge 
                  key={s.id}
                  variant={s.status === 'completed' ? 'default' : 'outline'}
                  className={`text-xs ${s.status === 'completed' ? 'bg-green-500' : ''}`}
                >
                  {s.id === 'source' ? '1' : s.id === 'www' ? '2' : s.id === 'external' ? '3' : '4'}
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
    </div>
  );
}

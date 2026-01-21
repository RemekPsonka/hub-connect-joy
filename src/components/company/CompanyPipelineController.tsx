import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Database, Globe, Search, DollarSign, Sparkles, 
  CheckCircle2, Clock, AlertCircle, Loader2, Lock,
  Building, RefreshCw
} from 'lucide-react';
import { useCompanyPipeline } from '@/hooks/useCompanyPipeline';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { SourceDataViewer } from './SourceDataViewer';
import { WebsiteDataViewer } from './WebsiteDataViewer';
import { ExternalDataViewer } from './ExternalDataViewer';
import { FinancialDataViewer } from './FinancialDataViewer';
import { CompanyAnalysisViewer } from './CompanyAnalysisViewer';

export interface Company {
  id: string;
  name: string;
  short_name?: string | null;
  tagline?: string | null;
  industry?: string | null;
  company_size?: string | null;
  logo_url?: string | null;
  website?: string | null;
  krs?: string | null;
  nip?: string | null;
  regon?: string | null;
  legal_form?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  source_data_api?: any;
  source_data_status?: string | null;
  source_data_date?: string | null;
  www_data?: any;
  www_data_status?: string | null;
  www_data_date?: string | null;
  external_data?: any;
  external_data_status?: string | null;
  external_data_date?: string | null;
  financial_data_3y?: any;
  financial_data_status?: string | null;
  financial_data_date?: string | null;
  ai_analysis?: any;
  company_analysis_status?: string | null;
  company_analysis_date?: string | null;
  analysis_confidence_score?: number | null;
  analysis_missing_sections?: string[] | null;
  analysis_data_sources?: any;
}

interface CompanyPipelineControllerProps {
  company: Company;
  contactEmail?: string | null;
  onUpdateRevenue?: () => void;
  isUpdatingRevenue?: boolean;
  onRemoveGroupCompany?: (name: string) => void;
}

type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';
type PipelineState = 'initial' | 'source_done' | 'partial' | 'complete';

interface ButtonState {
  enabled: boolean;
  canRun: boolean;
  status: StageStatus;
  reason?: string;
}

function getStatusIcon(status: StageStatus | null, isLoading: boolean) {
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getPipelineState(company: Company): PipelineState {
  if (company.company_analysis_status === 'completed') return 'complete';
  if (company.source_data_status === 'completed') {
    if (company.external_data_status === 'completed') return 'partial';
    return 'source_done';
  }
  return 'initial';
}

function getButtonStates(
  company: Company, 
  contactEmail?: string | null
): Record<string, ButtonState> {
  const hasName = !!company.name;
  const hasEmail = !!contactEmail;
  const hasWebsite = !!company.website;
  const stage1Done = company.source_data_status === 'completed';
  const stage2Done = company.www_data_status === 'completed';
  const stage3Done = company.external_data_status === 'completed';

  return {
    button1: {
      enabled: hasName || hasEmail,
      canRun: hasName || hasEmail,
      status: (company.source_data_status as StageStatus) || 'pending'
    },
    button2: {
      enabled: hasWebsite,
      canRun: hasWebsite && (stage1Done || !company.source_data_api),
      status: (company.www_data_status as StageStatus) || 'pending',
      reason: !hasWebsite ? 'Brak strony WWW' : undefined
    },
    button3: {
      enabled: hasName,
      canRun: hasName && (stage2Done || !hasWebsite),
      status: (company.external_data_status as StageStatus) || 'pending'
    },
    button4: {
      enabled: hasName,
      canRun: hasName,
      status: (company.financial_data_status as StageStatus) || 'pending'
    },
    button5: {
      enabled: stage1Done && stage3Done,
      canRun: stage1Done && stage3Done,
      status: (company.company_analysis_status as StageStatus) || 'pending',
      reason: (!stage1Done || !stage3Done) ? 'Wymaga: Przycisk 1 + Przycisk 3' : undefined
    }
  };
}

export function CompanyPipelineController({ 
  company, 
  contactEmail,
  onUpdateRevenue,
  isUpdatingRevenue,
  onRemoveGroupCompany
}: CompanyPipelineControllerProps) {
  const pipeline = useCompanyPipeline(company.id);
  const pipelineState = getPipelineState(company);
  const buttonStates = getButtonStates(company, contactEmail);
  
  const [activeTab, setActiveTab] = useState<string>(
    pipelineState === 'complete' ? 'profile-ai' : 'basic'
  );

  // Determine confidence badge
  const getConfidenceBadge = () => {
    const score = company.analysis_confidence_score || 0;
    if (score >= 80) return <Badge className="bg-green-500">⭐ PEŁNY ({score}%)</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500">CZĘŚCIOWY ({score}%)</Badge>;
    return <Badge variant="outline">PODSTAWOWY</Badge>;
  };

  // Determine verification badge
  const getVerificationBadge = () => {
    if (company.source_data_status === 'completed') {
      const source = company.source_data_api?.source;
      if (source === 'krs_api' || source === 'ceidg_api') {
        return <Badge className="bg-green-500">✅ PEWNE</Badge>;
      }
      return <Badge variant="secondary">Zweryfikowano</Badge>;
    }
    return null;
  };

  // Parse management from source data
  const getManagementList = () => {
    const management = company.source_data_api?.management;
    if (!management || !Array.isArray(management)) return null;
    return management.map((m: any) => `${m.name} (${m.position})`).join(', ');
  };

  // INITIAL STATE: Show input form
  if (pipelineState === 'initial') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            FIRMA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nazwa firmy</Label>
              <Input value={company.name || ''} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email kontaktu</Label>
              <Input value={contactEmail || ''} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Strona WWW</Label>
              <Input value={company.website || ''} readOnly className="bg-muted" />
            </div>
          </div>

          <Button
            onClick={() => pipeline.verifySource.mutate({
              companyName: company.name,
              existingKrs: company.krs || undefined,
              existingNip: company.nip || undefined
            })}
            disabled={!buttonStates.button1.canRun || pipeline.verifySource.isPending}
            className="w-full md:w-auto"
          >
            {pipeline.verifySource.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Sprawdź dane firmy
          </Button>
        </CardContent>
      </Card>
    );
  }

  // SOURCE_DONE STATE: Show verified data + buttons 2, 3, 4
  if (pipelineState === 'source_done') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              FIRMA
            </CardTitle>
            {getVerificationBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verified basic data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Nazwa:</span>
                <span className="font-medium">{company.name}</span>
              </div>
              {company.nip && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">NIP:</span>
                  <span>{company.nip}</span>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
              )}
              {company.krs && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">KRS:</span>
                  <span>{company.krs}</span>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
              )}
              {company.regon && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">REGON:</span>
                  <span>{company.regon}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {company.legal_form && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Forma:</span>
                  <span>{company.legal_form}</span>
                </div>
              )}
              {getManagementList() && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Zarząd:</span>
                  <span className="text-sm">{getManagementList()}</span>
                </div>
              )}
              {(company.address || company.city) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Adres:</span>
                  <span className="text-sm">
                    {[company.address, company.postal_code, company.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Dane podstawowe zweryfikowane
          </div>

          <Separator />

          {/* Buttons 2, 3, 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              variant={buttonStates.button2.status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.scanWebsite.mutate({ website: company.website! })}
              disabled={!buttonStates.button2.canRun || pipeline.scanWebsite.isPending}
            >
              {pipeline.scanWebsite.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {buttonStates.button2.status === 'completed' ? 'Odśwież WWW' : 'Analiza AI strony klienta'}
            </Button>
            
            <Button
              variant={buttonStates.button3.status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.analyzeExternal.mutate({ companyName: company.name })}
              disabled={!buttonStates.button3.canRun || pipeline.analyzeExternal.isPending}
            >
              {pipeline.analyzeExternal.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {buttonStates.button3.status === 'completed' ? 'Odśwież' : 'Głęboka analiza (Perplexity)'}
            </Button>
            
            <Button
              variant={buttonStates.button4.status === 'completed' ? 'outline' : 'secondary'}
              onClick={() => pipeline.fetchFinancials.mutate({ 
                companyName: company.name, 
                krs: company.krs || undefined 
              })}
              disabled={!buttonStates.button4.canRun || pipeline.fetchFinancials.isPending}
            >
              {pipeline.fetchFinancials.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              {buttonStates.button4.status === 'completed' ? 'Odśwież' : 'Pobierz dane finansowe'}
            </Button>
          </div>

          {/* Status info */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {buttonStates.button2.status === 'completed' && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                WWW przeskanowane
              </span>
            )}
            {buttonStates.button3.status === 'completed' && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Analiza zewnętrzna gotowa
              </span>
            )}
            {buttonStates.button4.status === 'completed' && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Dane finansowe pobrane
              </span>
            )}
          </div>

          {/* Button 5 - if ready */}
          {buttonStates.button5.canRun && (
            <>
              <Separator />
              <Button
                onClick={() => pipeline.synthesizeProfile.mutate()}
                disabled={pipeline.synthesizeProfile.isPending}
                className="w-full"
              >
                {pipeline.synthesizeProfile.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Wygeneruj profil klienta AI
              </Button>
            </>
          )}

          {!buttonStates.button5.canRun && buttonStates.button5.reason && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Profil AI: {buttonStates.button5.reason}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // PARTIAL or COMPLETE STATE: Show tabs with all data
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            FIRMA - PROFIL AI
          </CardTitle>
          {pipelineState === 'complete' ? getConfidenceBadge() : getVerificationBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic" className="text-xs md:text-sm">
              Podstawowe
            </TabsTrigger>
            <TabsTrigger 
              value="www" 
              className="text-xs md:text-sm"
              disabled={!company.www_data}
            >
              WWW
            </TabsTrigger>
            <TabsTrigger 
              value="external" 
              className="text-xs md:text-sm"
              disabled={!company.external_data}
            >
              External
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="text-xs md:text-sm"
              disabled={!company.financial_data_3y}
            >
              Finanse
            </TabsTrigger>
            <TabsTrigger 
              value="profile-ai" 
              className="text-xs md:text-sm"
              disabled={!company.ai_analysis}
            >
              Profil AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <SourceDataViewer 
              data={company.source_data_api} 
              company={company}
              onRefresh={() => pipeline.verifySource.mutate({
                companyName: company.name,
                existingKrs: company.krs || undefined,
                existingNip: company.nip || undefined
              })}
              isRefreshing={pipeline.verifySource.isPending}
            />
          </TabsContent>

          <TabsContent value="www" className="mt-4">
            <WebsiteDataViewer 
              data={company.www_data}
              onRefresh={() => company.website && pipeline.scanWebsite.mutate({ website: company.website })}
              isRefreshing={pipeline.scanWebsite.isPending}
            />
          </TabsContent>

          <TabsContent value="external" className="mt-4">
            <ExternalDataViewer 
              data={company.external_data}
              onRefresh={() => pipeline.analyzeExternal.mutate({ companyName: company.name })}
              isRefreshing={pipeline.analyzeExternal.isPending}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <FinancialDataViewer 
              data={company.financial_data_3y}
              onRefresh={() => pipeline.fetchFinancials.mutate({ 
                companyName: company.name, 
                krs: company.krs || undefined 
              })}
              isRefreshing={pipeline.fetchFinancials.isPending}
            />
          </TabsContent>

          <TabsContent value="profile-ai" className="mt-4">
            <CompanyAnalysisViewer
              analysis={company.ai_analysis}
              confidenceScore={company.analysis_confidence_score || 0}
              missingSections={company.analysis_missing_sections || []}
              dataSources={company.analysis_data_sources}
              onRegenerate={() => pipeline.synthesizeProfile.mutate()}
              isRegenerating={pipeline.synthesizeProfile.isPending}
              companyName={company.name}
              onUpdateRevenue={onUpdateRevenue}
              isUpdatingRevenue={isUpdatingRevenue}
              onRemoveGroupCompany={onRemoveGroupCompany}
            />
          </TabsContent>
        </Tabs>

        {/* Action buttons row */}
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {!company.www_data && company.website && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pipeline.scanWebsite.mutate({ website: company.website! })}
                disabled={pipeline.scanWebsite.isPending}
              >
                {pipeline.scanWebsite.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Globe className="h-3 w-3 mr-1" />
                )}
                Skanuj WWW
              </Button>
            )}
            {!company.financial_data_3y && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pipeline.fetchFinancials.mutate({ 
                  companyName: company.name, 
                  krs: company.krs || undefined 
                })}
                disabled={pipeline.fetchFinancials.isPending}
              >
                {pipeline.fetchFinancials.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <DollarSign className="h-3 w-3 mr-1" />
                )}
                Pobierz finanse
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => pipeline.synthesizeProfile.mutate()}
            disabled={!buttonStates.button5.canRun || pipeline.synthesizeProfile.isPending}
          >
            {pipeline.synthesizeProfile.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Aktualizuj profil AI
          </Button>
        </div>

        {/* Metadata footer */}
        <div className="text-xs text-muted-foreground space-y-1">
          {company.ai_analysis?.used_sources?.length > 0 && (
            <p>Źródła: {company.ai_analysis.used_sources.join(', ')}</p>
          )}
          {company.company_analysis_date && (
            <p>Ostatnia aktualizacja: {format(new Date(company.company_analysis_date), 'd MMMM yyyy, HH:mm', { locale: pl })}</p>
          )}
          {company.analysis_confidence_score && (
            <p>Confidence: {company.analysis_confidence_score}%</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

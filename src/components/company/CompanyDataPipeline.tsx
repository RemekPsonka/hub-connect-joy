import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, Globe, Search, DollarSign, Sparkles, 
  CheckCircle2, Clock, AlertCircle, Loader2, Lock
} from 'lucide-react';
import { useCompanyPipeline } from '@/hooks/useCompanyPipeline';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Company {
  id: string;
  name: string;
  website?: string | null;
  krs?: string | null;
  nip?: string | null;
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
}

interface CompanyDataPipelineProps {
  company: Company;
  contactEmail?: string | null;
}

type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';

function getStatusIcon(status: StageStatus | null, isLoading: boolean) {
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: StageStatus | null) {
  switch (status) {
    case 'completed': return <Badge variant="default" className="bg-green-500">Ukończono</Badge>;
    case 'processing': return <Badge variant="secondary">W toku...</Badge>;
    case 'failed': return <Badge variant="destructive">Błąd</Badge>;
    default: return <Badge variant="outline">Oczekuje</Badge>;
  }
}

export function CompanyDataPipeline({ company, contactEmail }: CompanyDataPipelineProps) {
  const pipeline = useCompanyPipeline(company.id);

  const stage1Status = company.source_data_status as StageStatus | null;
  const stage2Status = company.www_data_status as StageStatus | null;
  const stage3Status = company.external_data_status as StageStatus | null;
  const stage4Status = company.financial_data_status as StageStatus | null;
  const stage5Status = company.company_analysis_status as StageStatus | null;

  // Check conditions for each stage
  const canRunStage1 = !!company.name;
  const canRunStage2 = !!company.website;
  const canRunStage3 = stage1Status === 'completed' || !company.website;
  const canRunStage4 = !!company.name;
  const canRunStage5 = stage1Status === 'completed' && stage3Status === 'completed';

  const completedStages = [stage1Status, stage2Status, stage3Status, stage4Status, stage5Status]
    .filter(s => s === 'completed').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Pipeline danych firmy
          </CardTitle>
          <Badge variant="outline">{completedStages}/5 etapów</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stage 1: Source Verification */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            {getStatusIcon(stage1Status, pipeline.verifySource.isPending)}
            <div>
              <p className="font-medium text-sm">Etap 1: Weryfikacja podstaw</p>
              <p className="text-xs text-muted-foreground">KRS, CEIDG, NIP, REGON</p>
              {company.source_data_date && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(company.source_data_date), 'd MMM yyyy HH:mm', { locale: pl })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(stage1Status)}
            <Button
              size="sm"
              variant={stage1Status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.verifySource.mutate({ 
                companyName: company.name,
                existingKrs: company.krs || undefined,
                existingNip: company.nip || undefined
              })}
              disabled={!canRunStage1 || pipeline.verifySource.isPending}
            >
              {stage1Status === 'completed' ? 'Odśwież' : 'Sprawdź'}
            </Button>
          </div>
        </div>

        {/* Stage 2: Website Scan */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            {getStatusIcon(stage2Status, pipeline.scanWebsite.isPending)}
            <div>
              <p className="font-medium text-sm">Etap 2: Skanowanie WWW</p>
              <p className="text-xs text-muted-foreground">
                {company.website ? `Strona: ${company.website}` : 'Brak strony WWW'}
              </p>
              {company.www_data?.pages_scanned && (
                <p className="text-xs text-muted-foreground">
                  Przeskanowano {company.www_data.pages_scanned} stron
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(stage2Status)}
            <Button
              size="sm"
              variant={stage2Status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.scanWebsite.mutate({ website: company.website! })}
              disabled={!canRunStage2 || pipeline.scanWebsite.isPending}
            >
              <Globe className="h-3 w-3 mr-1" />
              Skanuj
            </Button>
          </div>
        </div>

        {/* Stage 3: External Analysis */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            {getStatusIcon(stage3Status, pipeline.analyzeExternal.isPending)}
            <div>
              <p className="font-medium text-sm">Etap 3: Analiza zewnętrzna</p>
              <p className="text-xs text-muted-foreground">News, kontrakty, partnerstwa</p>
              {company.external_data?.citations?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {company.external_data.citations.length} źródeł
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(stage3Status)}
            <Button
              size="sm"
              variant={stage3Status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.analyzeExternal.mutate({ companyName: company.name })}
              disabled={!canRunStage3 || pipeline.analyzeExternal.isPending}
            >
              <Search className="h-3 w-3 mr-1" />
              Analizuj
            </Button>
          </div>
        </div>

        {/* Stage 4: Financial Data */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            {getStatusIcon(stage4Status, pipeline.fetchFinancials.isPending)}
            <div>
              <p className="font-medium text-sm">Etap 4: Dane finansowe</p>
              <p className="text-xs text-muted-foreground">Przychody, zyski (3 lata)</p>
              {company.financial_data_3y?.years?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {company.financial_data_3y.years.length} lat danych
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(stage4Status)}
            <Button
              size="sm"
              variant={stage4Status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.fetchFinancials.mutate({ 
                companyName: company.name, 
                krs: company.krs || undefined 
              })}
              disabled={!canRunStage4 || pipeline.fetchFinancials.isPending}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Pobierz
            </Button>
          </div>
        </div>

        {/* Stage 5: AI Synthesis */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            {canRunStage5 
              ? getStatusIcon(stage5Status, pipeline.synthesizeProfile.isPending)
              : <Lock className="h-4 w-4 text-muted-foreground" />
            }
            <div>
              <p className="font-medium text-sm">Etap 5: Profil AI klienta</p>
              <p className="text-xs text-muted-foreground">
                {canRunStage5 
                  ? 'Synteza wszystkich danych' 
                  : 'Wymaga: Etap 1 + Etap 3'}
              </p>
              {company.company_analysis_date && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(company.company_analysis_date), 'd MMM yyyy HH:mm', { locale: pl })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(stage5Status)}
            <Button
              size="sm"
              variant={stage5Status === 'completed' ? 'outline' : 'default'}
              onClick={() => pipeline.synthesizeProfile.mutate()}
              disabled={!canRunStage5 || pipeline.synthesizeProfile.isPending}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Generuj
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

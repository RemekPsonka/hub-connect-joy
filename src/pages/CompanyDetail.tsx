import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompany } from '@/hooks/useCompanies';
import { CompanyProfileHeader } from '@/components/companies/CompanyProfileHeader';
import { CompanyAnalysisViewer } from '@/components/company';
import { CompanyContactsList } from '@/components/companies/CompanyContactsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading, error } = useCompany(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Firma nie została znaleziona</p>
        <Button variant="outline" onClick={() => navigate('/contacts?tab=companies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót do listy firm
        </Button>
      </div>
    );
  }

  const aiAnalysis = company.ai_analysis as Record<string, unknown> | null;

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/contacts?tab=companies')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do listy firm
      </Button>

      {/* Company Header */}
      <CompanyProfileHeader company={company} />

      {/* Tabs */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList>
          <TabsTrigger value="analysis">Analiza AI</TabsTrigger>
          <TabsTrigger value="contacts">Kontakty</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="mt-6">
          {company.company_analysis_status === 'completed' && aiAnalysis ? (
            <CompanyAnalysisViewer
              analysis={aiAnalysis}
              confidenceScore={company.analysis_confidence_score || 0.5}
              missingSections={company.analysis_missing_sections || []}
              dataSources={company.analysis_data_sources as Record<string, unknown> | undefined}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Brak pełnej analizy AI dla tej firmy.</p>
              <p className="text-sm mt-2">
                Uruchom analizę z poziomu nagłówka profilu firmy.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <CompanyContactsList companyId={company.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

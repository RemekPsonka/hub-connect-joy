import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Sparkles, Loader2 } from 'lucide-react';

import { AnalysisHeader } from './AnalysisHeader';
import { MissingSectionsWarning } from './MissingSectionsWarning';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { HistoryTimelineSection } from './sections/HistoryTimelineSection';
import { FinancialDataSection } from './sections/FinancialDataSection';
import { BusinessModelSection } from './sections/BusinessModelSection';
import { ProductsServicesSection } from './sections/ProductsServicesSection';
import { BrandsPartnershipsSection } from './sections/BrandsPartnershipsSection';
import { LocationsCoverageSection } from './sections/LocationsCoverageSection';
import { ClientsProjectsSection } from './sections/ClientsProjectsSection';
import { CompetitionSection } from './sections/CompetitionSection';
import { OfferSection } from './sections/OfferSection';
import { SeekingSection } from './sections/SeekingSection';
import { CollaborationSection } from './sections/CollaborationSection';
import { ManagementSection } from './sections/ManagementSection';
import { NewsSignalsSection } from './sections/NewsSignalsSection';
import { CSRSection } from './sections/CSRSection';
import { RegistryDataSection } from './sections/RegistryDataSection';
import { GroupCompaniesSection } from './sections/GroupCompaniesSection';
import { FallbackDataSection } from './sections/FallbackDataSection';

import type { CompanyAnalysisViewerProps, GroupCompany, ConsolidatedRevenue } from './types';

interface ExtendedCompanyAnalysisViewerProps extends CompanyAnalysisViewerProps {
  onUpdateRevenue?: () => void;
  isUpdatingRevenue?: boolean;
  onRemoveGroupCompany?: (name: string) => void;
}

export function CompanyAnalysisViewer({
  analysis,
  confidenceScore = 0.5,
  missingSections = [],
  dataSources,
  onRegenerate,
  isRegenerating,
  companyName,
  onUpdateRevenue,
  isUpdatingRevenue,
  onRemoveGroupCompany
}: ExtendedCompanyAnalysisViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Extract group companies from analysis
  const groupCompanies: GroupCompany[] = analysis?.group_companies as GroupCompany[] || [];
  const consolidatedRevenue: ConsolidatedRevenue | undefined = analysis?.consolidated_revenue as ConsolidatedRevenue | undefined;

  // No data state
  if (!analysis || (!analysis.description && !analysis.name && !analysis.industry)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Analiza AI firmy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Building className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Brak analizy AI dla tej firmy. Wygeneruj kompleksowy profil z wykorzystaniem Perplexity i Firecrawl.
            </p>
            {onRegenerate && (
              <Button onClick={onRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizuję...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Wygeneruj analizę AI
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <AnalysisHeader
          analysis={analysis}
          confidenceScore={confidenceScore}
          dataSources={dataSources}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
        />
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Fallback data section - when AI synthesis failed but we have Perplexity data */}
        {analysis.fallback_used && analysis.perplexity_raw && (
          <FallbackDataSection 
            perplexityRaw={analysis.perplexity_raw}
            citations={analysis.perplexity_citations}
            scrapedPages={analysis.scraped_pages_summary}
          />
        )}

        {/* Missing sections warning */}
        {missingSections.length > 0 && (
          <MissingSectionsWarning sections={missingSections} />
        )}

        {/* 8 Tabs grouping 16 sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
            <TabsTrigger value="overview" className="text-xs px-2 py-1.5">Przegląd</TabsTrigger>
            <TabsTrigger value="business" className="text-xs px-2 py-1.5">Biznes</TabsTrigger>
            <TabsTrigger value="products" className="text-xs px-2 py-1.5">Produkty</TabsTrigger>
            <TabsTrigger value="market" className="text-xs px-2 py-1.5">Rynek</TabsTrigger>
            <TabsTrigger value="operations" className="text-xs px-2 py-1.5">Operacje</TabsTrigger>
            <TabsTrigger value="collaboration" className="text-xs px-2 py-1.5">Współpraca</TabsTrigger>
            <TabsTrigger value="news" className="text-xs px-2 py-1.5">Aktualności</TabsTrigger>
            <TabsTrigger value="data" className="text-xs px-2 py-1.5">Dane</TabsTrigger>
          </TabsList>

          {/* Tab: Przegląd - sekcje 1, 2, 3 + grupa kapitałowa */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <BasicInfoSection data={analysis} />
            <HistoryTimelineSection data={analysis} />
            <FinancialDataSection 
              data={analysis} 
              onUpdateRevenue={onUpdateRevenue}
              isUpdatingRevenue={isUpdatingRevenue}
            />
            {groupCompanies.length > 0 && (
              <GroupCompaniesSection 
                groupCompanies={groupCompanies}
                consolidatedRevenue={consolidatedRevenue}
                onRemoveCompany={onRemoveGroupCompany}
              />
            )}
          </TabsContent>

          {/* Tab: Biznes - sekcje 4, 13 */}
          <TabsContent value="business" className="mt-4 space-y-4">
            <BusinessModelSection data={analysis} />
            <ManagementSection data={analysis} />
          </TabsContent>

          {/* Tab: Produkty - sekcje 5, 6 */}
          <TabsContent value="products" className="mt-4 space-y-4">
            <ProductsServicesSection data={analysis} />
            <BrandsPartnershipsSection data={analysis} />
          </TabsContent>

          {/* Tab: Rynek - sekcje 9, 8 */}
          <TabsContent value="market" className="mt-4 space-y-4">
            <CompetitionSection data={analysis} />
            <ClientsProjectsSection data={analysis} />
          </TabsContent>

          {/* Tab: Operacje - sekcja 7 */}
          <TabsContent value="operations" className="mt-4 space-y-4">
            <LocationsCoverageSection data={analysis} />
          </TabsContent>

          {/* Tab: Współpraca - sekcje 10, 11, 12 */}
          <TabsContent value="collaboration" className="mt-4 space-y-4">
            <OfferSection data={analysis} />
            <SeekingSection data={analysis} />
            <CollaborationSection data={analysis} />
          </TabsContent>

          {/* Tab: Aktualności - sekcje 14, 15 */}
          <TabsContent value="news" className="mt-4 space-y-4">
            <NewsSignalsSection data={analysis} />
            <CSRSection data={analysis} />
          </TabsContent>

          {/* Tab: Dane - sekcja 16 + metadata */}
          <TabsContent value="data" className="mt-4 space-y-4">
            <RegistryDataSection data={analysis} dataSources={dataSources} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

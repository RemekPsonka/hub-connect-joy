import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Sparkles, Loader2, Briefcase, Package, Globe, Users, Handshake, Newspaper, Database } from 'lucide-react';

import { AnalysisDashboardHeader } from './AnalysisDashboardHeader';
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
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Brak analizy AI</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Wygeneruj kompleksowy profil firmy z wykorzystaniem Perplexity AI i Firecrawl.
            </p>
            {onRegenerate && (
              <Button onClick={onRegenerate} disabled={isRegenerating} size="lg">
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <AnalysisDashboardHeader
          analysis={analysis}
          confidenceScore={confidenceScore}
          missingSections={missingSections}
          dataSources={dataSources}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
          fallbackUsed={analysis.fallback_used}
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Fallback data section - when AI synthesis failed but we have Perplexity data */}
        {analysis.fallback_used && analysis.perplexity_raw && (
          <FallbackDataSection 
            perplexityRaw={analysis.perplexity_raw}
            citations={analysis.perplexity_citations}
            scrapedPages={analysis.scraped_pages_summary}
          />
        )}

        {/* Modern Tabs with icons */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-muted/50 rounded-xl p-1.5 h-auto flex flex-wrap gap-1">
            <TabsTrigger 
              value="overview" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Przegląd</span>
            </TabsTrigger>
            <TabsTrigger 
              value="business" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Biznes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produkty</span>
            </TabsTrigger>
            <TabsTrigger 
              value="market" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Rynek</span>
            </TabsTrigger>
            <TabsTrigger 
              value="operations" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Operacje</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collaboration" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Handshake className="h-4 w-4" />
              <span className="hidden sm:inline">Współpraca</span>
            </TabsTrigger>
            <TabsTrigger 
              value="news" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Aktualności</span>
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Dane</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Przegląd - sekcje 1, 2, 3 + grupa kapitałowa */}
          <TabsContent value="overview" className="mt-6 space-y-4">
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
          <TabsContent value="business" className="mt-6 space-y-4">
            <BusinessModelSection data={analysis} />
            <ManagementSection data={analysis} />
          </TabsContent>

          {/* Tab: Produkty - sekcje 5, 6 */}
          <TabsContent value="products" className="mt-6 space-y-4">
            <ProductsServicesSection data={analysis} />
            <BrandsPartnershipsSection data={analysis} />
          </TabsContent>

          {/* Tab: Rynek - sekcje 9, 8 */}
          <TabsContent value="market" className="mt-6 space-y-4">
            <CompetitionSection data={analysis} />
            <ClientsProjectsSection data={analysis} />
          </TabsContent>

          {/* Tab: Operacje - sekcja 7 */}
          <TabsContent value="operations" className="mt-6 space-y-4">
            <LocationsCoverageSection data={analysis} />
          </TabsContent>

          {/* Tab: Współpraca - sekcje 10, 11, 12 */}
          <TabsContent value="collaboration" className="mt-6 space-y-4">
            <OfferSection data={analysis} />
            <SeekingSection data={analysis} />
            <CollaborationSection data={analysis} />
          </TabsContent>

          {/* Tab: Aktualności - sekcje 14, 15 */}
          <TabsContent value="news" className="mt-6 space-y-4">
            <NewsSignalsSection data={analysis} />
            <CSRSection data={analysis} />
          </TabsContent>

          {/* Tab: Dane - sekcja 16 + metadata */}
          <TabsContent value="data" className="mt-6 space-y-4">
            <RegistryDataSection data={analysis} dataSources={dataSources} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

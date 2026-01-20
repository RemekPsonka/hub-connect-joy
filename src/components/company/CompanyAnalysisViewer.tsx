import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Sparkles, 
  Loader2, 
  Package, 
  Users, 
  Handshake, 
  Newspaper, 
  Database,
  TrendingUp,
  GitBranch,
  MapPin,
  Briefcase
} from 'lucide-react';

import { AnalysisDashboardHeader } from './AnalysisDashboardHeader';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { HistoryTimelineSection } from './sections/HistoryTimelineSection';
import { FinancialDashboard } from './sections/FinancialDashboard';
import { BusinessModelSection } from './sections/BusinessModelSection';
import { ProductsServicesSection } from './sections/ProductsServicesSection';
import { BrandsPartnershipsSection } from './sections/BrandsPartnershipsSection';
import { LocationsCoverageSection } from './sections/LocationsCoverageSection';
import { ClientsProjectsSection } from './sections/ClientsProjectsSection';
import { CompetitionSection } from './sections/CompetitionSection';
import { OfferSection } from './sections/OfferSection';
import { SeekingSection } from './sections/SeekingSection';
import { CollaborationSection } from './sections/CollaborationSection';
import { PersonnelSection } from './sections/PersonnelSection';
import { AffiliationsSection } from './sections/AffiliationsSection';
import { NewsSignalsSection } from './sections/NewsSignalsSection';
import { CSRSection } from './sections/CSRSection';
import { RegistryDataSection } from './sections/RegistryDataSection';
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
  const [activeTab, setActiveTab] = useState('profile');

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

        {/* New 8-Tab Structure */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-muted/50 rounded-xl p-1.5 h-auto flex flex-wrap gap-1">
            {/* 1. Profil */}
            <TabsTrigger 
              value="profile" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Profil</span>
            </TabsTrigger>
            
            {/* 2. Finanse - MEGA WAŻNA */}
            <TabsTrigger 
              value="financials" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Finanse</span>
            </TabsTrigger>
            
            {/* 3. Produkty */}
            <TabsTrigger 
              value="products" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Produkty</span>
            </TabsTrigger>
            
            {/* 4. Współpraca */}
            <TabsTrigger 
              value="collaboration" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Handshake className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Współpraca</span>
            </TabsTrigger>
            
            {/* 5. Aktualności */}
            <TabsTrigger 
              value="news" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Aktualności</span>
            </TabsTrigger>
            
            {/* 6. Osoby */}
            <TabsTrigger 
              value="people" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Osoby</span>
            </TabsTrigger>
            
            {/* 7. Powiązania */}
            <TabsTrigger 
              value="affiliations" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Powiązania</span>
            </TabsTrigger>
            
            {/* 8. Lokalizacje */}
            <TabsTrigger 
              value="locations" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Lokalizacje</span>
            </TabsTrigger>
            
            {/* 9. Realizacje */}
            <TabsTrigger 
              value="projects" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Realizacje</span>
            </TabsTrigger>
            
            {/* 10. Dane */}
            <TabsTrigger 
              value="data" 
              className="flex-1 min-w-[90px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Dane</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Profil - podstawowe info, historia, model biznesowy */}
          <TabsContent value="profile" className="mt-6 space-y-4">
            <BasicInfoSection data={analysis} />
            <HistoryTimelineSection data={analysis} />
            <BusinessModelSection data={analysis} />
          </TabsContent>

          {/* Tab 2: Finanse - MEGA WAŻNA zakładka z wykresami */}
          <TabsContent value="financials" className="mt-6 space-y-4">
            <FinancialDashboard 
              data={analysis} 
              onUpdateRevenue={onUpdateRevenue}
              isUpdatingRevenue={isUpdatingRevenue}
            />
          </TabsContent>

          {/* Tab 3: Produkty - produkty, usługi, marki */}
          <TabsContent value="products" className="mt-6 space-y-4">
            <ProductsServicesSection data={analysis} />
            <BrandsPartnershipsSection data={analysis} />
          </TabsContent>

          {/* Tab 4: Współpraca - czego firma szuka, potencjał współpracy */}
          <TabsContent value="collaboration" className="mt-6 space-y-4">
            <OfferSection data={analysis} />
            <SeekingSection data={analysis} />
            <CollaborationSection data={analysis} />
          </TabsContent>

          {/* Tab 5: Aktualności - newsy, sygnały rynkowe, CSR */}
          <TabsContent value="news" className="mt-6 space-y-4">
            <NewsSignalsSection data={analysis} />
            <CSRSection data={analysis} />
          </TabsContent>

          {/* Tab 6: Osoby - zarząd, wspólnicy */}
          <TabsContent value="people" className="mt-6 space-y-4">
            <PersonnelSection data={analysis} />
          </TabsContent>

          {/* Tab 7: Powiązania - grupa kapitałowa, spółki powiązane */}
          <TabsContent value="affiliations" className="mt-6 space-y-4">
            <AffiliationsSection 
              data={analysis}
              groupCompanies={groupCompanies}
              consolidatedRevenue={consolidatedRevenue}
              onRemoveCompany={onRemoveGroupCompany}
            />
          </TabsContent>

          {/* Tab 8: Lokalizacje - siedziby, oddziały, zasięg */}
          <TabsContent value="locations" className="mt-6 space-y-4">
            <LocationsCoverageSection data={analysis} />
          </TabsContent>

          {/* Tab 9: Realizacje - projekty referencyjne, klienci, konkurencja */}
          <TabsContent value="projects" className="mt-6 space-y-4">
            <ClientsProjectsSection data={analysis} />
            <CompetitionSection data={analysis} />
          </TabsContent>

          {/* Tab 10: Dane - NIP/KRS/REGON, źródła danych, metadata */}
          <TabsContent value="data" className="mt-6 space-y-4">
            <RegistryDataSection data={analysis} dataSources={dataSources} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

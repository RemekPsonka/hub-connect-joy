import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Building, 
  DollarSign, 
  Package, 
  Handshake, 
  Newspaper, 
  Users, 
  Network, 
  MapPin, 
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { SourcesTabContent } from './SourcesTabContent';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { FinancialDashboard } from './sections/FinancialDashboard';
import { ProductsServicesSection } from './sections/ProductsServicesSection';
import { CollaborationSection } from './sections/CollaborationSection';
import { NewsSignalsSection } from './sections/NewsSignalsSection';
import { PersonnelSection } from './sections/PersonnelSection';
import { AffiliationsSection } from './sections/AffiliationsSection';
import { LocationsCoverageSection } from './sections/LocationsCoverageSection';
import { ClientsProjectsSection } from './sections/ClientsProjectsSection';
import { FallbackDataSection } from './sections/FallbackDataSection';
import { useCompanyPipeline } from '@/hooks/useCompanyPipeline';
import type { Company } from './CompanyPipelineController';
import type { CompanyAnalysis } from './types';

interface CompanyFlatTabsProps {
  company: Company;
  contactEmail?: string | null;
  onUpdateRevenue?: () => void;
  isUpdatingRevenue?: boolean;
  onRemoveGroupCompany?: (name: string) => void;
}

export function CompanyFlatTabs({ 
  company, 
  contactEmail,
  onUpdateRevenue,
  isUpdatingRevenue,
  onRemoveGroupCompany
}: CompanyFlatTabsProps) {
  const [activeTab, setActiveTab] = useState('sources');
  const pipeline = useCompanyPipeline(company.id);

  // Parse AI analysis
  const aiAnalysis = company.ai_analysis as CompanyAnalysis | null;
  const hasAnalysis = !!aiAnalysis && company.company_analysis_status === 'completed';
  const fallbackUsed = aiAnalysis?.fallback_used;

  // Check which sections have data
  const hasFinancials = !!(aiAnalysis?.revenue || aiAnalysis?.revenue_history?.length || aiAnalysis?.financial_statements?.length);
  const hasProducts = !!(aiAnalysis?.products?.length || aiAnalysis?.services?.length);
  const hasCollaboration = !!(aiAnalysis?.collaboration_opportunities || aiAnalysis?.ideal_partner_profile || aiAnalysis?.synergy_potential);
  const hasNews = !!(aiAnalysis?.recent_news || aiAnalysis?.market_signals);
  const hasPersonnel = !!(aiAnalysis?.management?.length);
  const hasAffiliations = !!(aiAnalysis?.group_companies?.length || aiAnalysis?.represented_brands?.length);
  const hasLocations = !!(aiAnalysis?.locations?.length || aiAnalysis?.geographic_coverage);
  const hasProjects = !!(aiAnalysis?.reference_projects?.length || aiAnalysis?.key_clients?.length);

  const tabs = [
    { id: 'sources', label: 'Źródła', icon: Database, always: true },
    { id: 'profile', label: 'Profil AI', icon: Building, always: hasAnalysis },
    { id: 'financials', label: 'Finanse', icon: DollarSign, always: hasFinancials },
    { id: 'products', label: 'Produkty', icon: Package, always: hasProducts },
    { id: 'collaboration', label: 'Współpraca', icon: Handshake, always: hasCollaboration },
    { id: 'news', label: 'Aktualności', icon: Newspaper, always: hasNews },
    { id: 'personnel', label: 'Osoby', icon: Users, always: hasPersonnel },
    { id: 'affiliations', label: 'Powiązania', icon: Network, always: hasAffiliations },
    { id: 'locations', label: 'Lokalizacje', icon: MapPin, always: hasLocations },
    { id: 'projects', label: 'Realizacje', icon: Briefcase, always: hasProjects },
  ];

  // Filter to show only tabs with data (except Sources which is always shown)
  const visibleTabs = tabs.filter(tab => tab.id === 'sources' || tab.always);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-1.5 px-3 py-1.5"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Fallback warning */}
      {fallbackUsed && activeTab !== 'sources' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Niekompletna synteza</p>
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              Profil został wygenerowany na podstawie niepełnych danych. Uruchom brakujące etapy w zakładce "Źródła".
            </p>
          </div>
        </div>
      )}

      <TabsContent value="sources" className="mt-0">
        <SourcesTabContent 
          company={company} 
          contactEmail={contactEmail}
          pipeline={pipeline}
        />
      </TabsContent>

      {hasAnalysis && aiAnalysis && (
        <>
          <TabsContent value="profile" className="mt-0">
            <BasicInfoSection data={aiAnalysis} />
            {aiAnalysis.fallback_used && (
              <div className="mt-4">
                <FallbackDataSection 
                  perplexityRaw={aiAnalysis.perplexity_raw}
                  citations={aiAnalysis.perplexity_citations}
                  scrapedPages={aiAnalysis.scraped_pages_summary}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="financials" className="mt-0">
            <FinancialDashboard 
              data={aiAnalysis} 
              onUpdateRevenue={onUpdateRevenue}
              isUpdatingRevenue={isUpdatingRevenue}
            />
          </TabsContent>

          <TabsContent value="products" className="mt-0">
            <ProductsServicesSection data={aiAnalysis} />
          </TabsContent>

          <TabsContent value="collaboration" className="mt-0">
            <CollaborationSection data={aiAnalysis} />
          </TabsContent>

          <TabsContent value="news" className="mt-0">
            <NewsSignalsSection data={aiAnalysis} />
          </TabsContent>

          <TabsContent value="personnel" className="mt-0">
            <PersonnelSection data={aiAnalysis} />
          </TabsContent>

          <TabsContent value="affiliations" className="mt-0">
            <AffiliationsSection 
              data={aiAnalysis}
              onRemoveCompany={onRemoveGroupCompany}
            />
          </TabsContent>

          <TabsContent value="locations" className="mt-0">
            <LocationsCoverageSection data={aiAnalysis} />
          </TabsContent>

          <TabsContent value="projects" className="mt-0">
            <ClientsProjectsSection data={aiAnalysis} />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}

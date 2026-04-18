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
  AlertTriangle,
  Shield,
  GitBranch,
  CalendarClock,
  MapPinned,
  Scale
} from 'lucide-react';
import { SourcesTabContent } from './SourcesTabContent';
import { CompanyExternalDataTab } from '@/components/companies/CompanyExternalDataTab';
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
import { InsurancePanel } from '@/components/insurance';
import { StructureVisualization } from '@/components/structure';
import { RenewalTimeline } from '@/components/renewal';
import { LiabilityDNAPanel } from '@/components/liability';
import { ExposureManager } from '@/components/exposure';
import { CompanyContactsList } from '@/components/companies/CompanyContactsList';
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
  const hasAnalysis = aiAnalysis !== null && 
    typeof aiAnalysis === 'object' && 
    Object.keys(aiAnalysis).length > 0 &&
    company.company_analysis_status === 'completed';
  const fallbackUsed = aiAnalysis?.fallback_used;

  // Show ALL tabs when analysis is complete - individual sections handle empty states
  const tabs = [
    { id: 'sources', label: 'Źródła', icon: Database, always: true },
    { id: 'external-data', label: 'Dane zewnętrzne', icon: Database, always: true },
    { id: 'structure', label: 'Struktura', icon: GitBranch, always: true },
    { id: 'insurance', label: 'Ubezpieczenia', icon: Shield, always: true },
    { id: 'exposure', label: 'Ekspozycja', icon: MapPinned, always: true },
    { id: 'liability-dna', label: 'DNA OC', icon: Scale, always: true },
    { id: 'timeline', label: 'Harmonogram', icon: CalendarClock, always: true },
    { id: 'profile', label: 'Profil AI', icon: Building, always: hasAnalysis },
    { id: 'financials', label: 'Finanse', icon: DollarSign, always: hasAnalysis },
    { id: 'products', label: 'Produkty', icon: Package, always: hasAnalysis },
    { id: 'collaboration', label: 'Współpraca', icon: Handshake, always: hasAnalysis },
    { id: 'news', label: 'Aktualności', icon: Newspaper, always: hasAnalysis },
    { id: 'personnel', label: 'Osoby', icon: Users, always: hasAnalysis },
    { id: 'affiliations', label: 'Powiązania', icon: Network, always: hasAnalysis },
    { id: 'locations', label: 'Lokalizacje', icon: MapPin, always: hasAnalysis },
    { id: 'projects', label: 'Realizacje', icon: Briefcase, always: hasAnalysis },
    { id: 'contacts', label: 'Kontakty', icon: Users, always: true },
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

      <TabsContent value="external-data" className="mt-0">
        <CompanyExternalDataTab companyId={company.id} />
      </TabsContent>

      <TabsContent value="structure" className="mt-0">
        <StructureVisualization 
          company={{
            id: company.id,
            name: company.name,
            nip: company.nip,
            krs: company.krs,
            logo_url: company.logo_url,
          }} 
        />
      </TabsContent>

      <TabsContent value="insurance" className="mt-0">
        <InsurancePanel company={company} />
      </TabsContent>

      <TabsContent value="exposure" className="mt-0">
        <ExposureManager companyId={company.id} />
      </TabsContent>

      <TabsContent value="liability-dna" className="mt-0">
        <LiabilityDNAPanel companyId={company.id} />
      </TabsContent>

      <TabsContent value="timeline" className="mt-0">
        <RenewalTimeline companyId={company.id} />
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

      <TabsContent value="contacts" className="mt-0">
        <CompanyContactsList companyId={company.id} />
      </TabsContent>
    </Tabs>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, RefreshCw, Loader2, Building, Briefcase, Search, 
  Users, Newspaper, FileText, Target, Lightbulb, ExternalLink,
  CheckCircle, AlertCircle, TrendingUp, Award, Handshake
} from 'lucide-react';

interface Product {
  name: string;
  description: string;
  target?: string;
}

interface Service {
  name: string;
  description: string;
  target?: string;
}

interface ManagementPerson {
  name: string;
  position: string;
  source?: string;
  linkedin?: string;
}

interface NewsItem {
  date?: string;
  title: string;
  summary: string;
  source?: string;
}

interface CollaborationOpportunity {
  area: string;
  description: string;
  fit_for?: string;
}

interface EnrichmentMetadata {
  perplexity_used?: boolean;
  pages_scraped?: number;
  external_sources?: number;
  perplexity_citations?: string[];
  analyzed_at?: string;
}

interface CompanyAIAnalysis {
  name?: string;
  industry?: string;
  sub_industries?: string[];
  description?: string;
  
  business_model?: string;
  value_proposition?: string;
  competitive_position?: string;
  market_share_info?: string;
  
  core_activities?: string[];
  products?: Product[];
  services?: Service[];
  key_projects?: string[];
  
  offer_summary?: string;
  unique_selling_points?: string[];
  certifications?: string[];
  partnerships?: string[];
  
  seeking_clients?: string;
  seeking_partners?: string;
  seeking_suppliers?: string;
  hiring_positions?: string[];
  expansion_plans?: string;
  pain_points?: string[];
  
  collaboration_opportunities?: CollaborationOpportunity[];
  ideal_partner_profile?: string;
  synergy_potential?: string[];
  
  management?: ManagementPerson[];
  company_size?: string;
  employee_count?: string;
  company_culture?: string;
  founding_year?: string;
  founding_story?: string;
  
  recent_news?: NewsItem[];
  market_signals?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  
  legal_form?: string;
  nip?: string;
  regon?: string;
  krs?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  
  confidence?: 'high' | 'medium' | 'low';
  data_freshness?: string;
  sources?: string[];
  analysis_notes?: string[];
  
  enrichment_metadata?: EnrichmentMetadata;
  
  // Legacy fields for backwards compatibility
  what_company_does?: string;
  main_products_services?: string[];
  what_company_offers?: string;
  what_company_seeks?: string;
  target_clients?: string;
  competitive_advantage?: string;
  collaboration_areas?: string;
}

interface CompanyAIAnalysisCardProps {
  aiAnalysis: CompanyAIAnalysis | null;
  companyDescription?: string | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const confidenceBadge = (confidence?: string) => {
  switch (confidence) {
    case 'high':
      return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Wysoka pewność</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />Średnia pewność</Badge>;
    case 'low':
      return <Badge className="bg-red-500/10 text-red-600 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Niska pewność</Badge>;
    default:
      return null;
  }
};

const sentimentBadge = (sentiment?: string) => {
  switch (sentiment) {
    case 'positive':
      return <Badge variant="outline" className="text-green-600"><TrendingUp className="h-3 w-3 mr-1" />Pozytywny</Badge>;
    case 'negative':
      return <Badge variant="outline" className="text-red-600"><TrendingUp className="h-3 w-3 mr-1 rotate-180" />Negatywny</Badge>;
    default:
      return <Badge variant="outline">Neutralny</Badge>;
  }
};

export function CompanyAIAnalysisCard({ 
  aiAnalysis, 
  companyDescription,
  onRegenerate, 
  isRegenerating 
}: CompanyAIAnalysisCardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const hasData = !!(companyDescription || aiAnalysis?.description);
  
  // Format analysis date
  const analysisDate = aiAnalysis?.enrichment_metadata?.analyzed_at 
    ? new Date(aiAnalysis.enrichment_metadata.analyzed_at).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Analiza AI firmy
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Building className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Brak analizy AI dla tej firmy. Wygeneruj kompleksowy profil z wykorzystaniem Perplexity i Firecrawl.
            </p>
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Analiza AI firmy
          </CardTitle>
          <div className="flex items-center gap-2">
            {confidenceBadge(aiAnalysis?.confidence)}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regeneruj
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Data sources info */}
        {aiAnalysis?.enrichment_metadata && (
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            {aiAnalysis.enrichment_metadata.perplexity_used && (
              <Badge variant="outline" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Perplexity
              </Badge>
            )}
            {aiAnalysis.enrichment_metadata.pages_scraped && aiAnalysis.enrichment_metadata.pages_scraped > 0 && (
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {aiAnalysis.enrichment_metadata.pages_scraped} stron
              </Badge>
            )}
            {aiAnalysis.enrichment_metadata.external_sources && aiAnalysis.enrichment_metadata.external_sources > 0 && (
              <Badge variant="outline" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                {aiAnalysis.enrichment_metadata.external_sources} źródeł
              </Badge>
            )}
            {analysisDate && (
              <span className="text-muted-foreground">• Analiza: {analysisDate}</span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="overview" className="text-xs px-2 py-1.5">
              <Building className="h-3 w-3 mr-1 hidden sm:inline" />
              Przegląd
            </TabsTrigger>
            <TabsTrigger value="offer" className="text-xs px-2 py-1.5">
              <Briefcase className="h-3 w-3 mr-1 hidden sm:inline" />
              Oferta
            </TabsTrigger>
            <TabsTrigger value="needs" className="text-xs px-2 py-1.5">
              <Target className="h-3 w-3 mr-1 hidden sm:inline" />
              Potrzeby
            </TabsTrigger>
            <TabsTrigger value="management" className="text-xs px-2 py-1.5">
              <Users className="h-3 w-3 mr-1 hidden sm:inline" />
              Zarząd
            </TabsTrigger>
            <TabsTrigger value="news" className="text-xs px-2 py-1.5">
              <Newspaper className="h-3 w-3 mr-1 hidden sm:inline" />
              Aktualności
            </TabsTrigger>
            <TabsTrigger value="registry" className="text-xs px-2 py-1.5">
              <FileText className="h-3 w-3 mr-1 hidden sm:inline" />
              Rejestry
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {aiAnalysis?.description || companyDescription}
              </p>
            </div>
            
            {aiAnalysis?.sub_industries && aiAnalysis.sub_industries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Subbranże</p>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.sub_industries.map((sub, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{sub}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {aiAnalysis?.business_model && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Model biznesowy</p>
                <p className="text-sm">{aiAnalysis.business_model}</p>
              </div>
            )}
            
            {aiAnalysis?.value_proposition && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Unikalna propozycja wartości (USP)</p>
                <p className="text-sm">{aiAnalysis.value_proposition}</p>
              </div>
            )}
            
            {aiAnalysis?.competitive_position && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pozycja konkurencyjna</p>
                <p className="text-sm">{aiAnalysis.competitive_position}</p>
              </div>
            )}
            
            {/* Legacy fallback */}
            {aiAnalysis?.what_company_does && !aiAnalysis?.business_model && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Co firma robi</p>
                <p className="text-sm">{aiAnalysis.what_company_does}</p>
              </div>
            )}
          </TabsContent>

          {/* OFFER TAB */}
          <TabsContent value="offer" className="mt-4 space-y-4">
            {aiAnalysis?.offer_summary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Podsumowanie oferty</p>
                <p className="text-sm">{aiAnalysis.offer_summary}</p>
              </div>
            )}
            
            {aiAnalysis?.products && aiAnalysis.products.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Produkty ({aiAnalysis.products.length})
                </p>
                <div className="space-y-2">
                  {aiAnalysis.products.map((product, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                      {product.target && (
                        <p className="text-xs text-primary mt-1">→ {product.target}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {aiAnalysis?.services && aiAnalysis.services.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Usługi ({aiAnalysis.services.length})
                </p>
                <div className="space-y-2">
                  {aiAnalysis.services.map((service, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                      {service.target && (
                        <p className="text-xs text-primary mt-1">→ {service.target}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {aiAnalysis?.unique_selling_points && aiAnalysis.unique_selling_points.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Przewagi konkurencyjne
                </p>
                <ul className="space-y-1">
                  {aiAnalysis.unique_selling_points.map((usp, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {usp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {aiAnalysis?.key_projects && aiAnalysis.key_projects.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Kluczowe projekty</p>
                <ul className="space-y-1">
                  {aiAnalysis.key_projects.map((project, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {project}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {aiAnalysis?.certifications && aiAnalysis.certifications.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Certyfikaty i nagrody</p>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.certifications.map((cert, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{cert}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Legacy fallback */}
            {aiAnalysis?.what_company_offers && !aiAnalysis?.offer_summary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Co firma oferuje</p>
                <p className="text-sm">{aiAnalysis.what_company_offers}</p>
              </div>
            )}
          </TabsContent>

          {/* NEEDS TAB */}
          <TabsContent value="needs" className="mt-4 space-y-4">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Kluczowe dla matchowania kontaktów
              </p>
            </div>
            
            {aiAnalysis?.seeking_clients && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Szukani klienci
                </p>
                <p className="text-sm">{aiAnalysis.seeking_clients}</p>
              </div>
            )}
            
            {aiAnalysis?.seeking_partners && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Handshake className="h-3 w-3" />
                  Szukani partnerzy
                </p>
                <p className="text-sm">{aiAnalysis.seeking_partners}</p>
              </div>
            )}
            
            {aiAnalysis?.seeking_suppliers && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Szukani dostawcy</p>
                <p className="text-sm">{aiAnalysis.seeking_suppliers}</p>
              </div>
            )}
            
            {aiAnalysis?.hiring_positions && aiAnalysis.hiring_positions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Otwarte rekrutacje</p>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.hiring_positions.map((pos, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{pos}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {aiAnalysis?.expansion_plans && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Plany rozwoju</p>
                <p className="text-sm">{aiAnalysis.expansion_plans}</p>
              </div>
            )}
            
            {aiAnalysis?.pain_points && aiAnalysis.pain_points.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Wyzwania i problemy</p>
                <ul className="space-y-1">
                  {aiAnalysis.pain_points.map((pain, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-orange-500">!</span>
                      {pain}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Separator />
            
            {aiAnalysis?.collaboration_opportunities && aiAnalysis.collaboration_opportunities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Handshake className="h-3 w-3" />
                  Możliwości współpracy
                </p>
                <div className="space-y-2">
                  {aiAnalysis.collaboration_opportunities.map((opp, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">{opp.area}</p>
                      <p className="text-xs text-muted-foreground">{opp.description}</p>
                      {opp.fit_for && (
                        <p className="text-xs text-primary mt-1">Pasuje dla: {opp.fit_for}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {aiAnalysis?.ideal_partner_profile && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Idealny partner</p>
                <p className="text-sm">{aiAnalysis.ideal_partner_profile}</p>
              </div>
            )}
            
            {aiAnalysis?.synergy_potential && aiAnalysis.synergy_potential.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Potencjał synergii</p>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.synergy_potential.map((syn, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{syn}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Legacy fallback */}
            {aiAnalysis?.what_company_seeks && !aiAnalysis?.seeking_clients && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Czego firma szuka</p>
                <p className="text-sm">{aiAnalysis.what_company_seeks}</p>
              </div>
            )}
          </TabsContent>

          {/* MANAGEMENT TAB */}
          <TabsContent value="management" className="mt-4 space-y-4">
            {aiAnalysis?.management && aiAnalysis.management.length > 0 ? (
              <div className="space-y-2">
                {aiAnalysis.management.map((person, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.position}</p>
                    </div>
                    {person.source && (
                      <a 
                        href={person.source.startsWith('http') ? person.source : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {person.source.startsWith('http') ? <ExternalLink className="h-3 w-3" /> : person.source}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Brak danych o zarządzie</p>
            )}
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              {aiAnalysis?.company_size && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Wielkość firmy</p>
                  <p className="text-sm capitalize">{aiAnalysis.company_size}</p>
                </div>
              )}
              {aiAnalysis?.employee_count && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Liczba pracowników</p>
                  <p className="text-sm">{aiAnalysis.employee_count}</p>
                </div>
              )}
              {aiAnalysis?.founding_year && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Rok założenia</p>
                  <p className="text-sm">{aiAnalysis.founding_year}</p>
                </div>
              )}
              {aiAnalysis?.legal_form && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Forma prawna</p>
                  <p className="text-sm">{aiAnalysis.legal_form}</p>
                </div>
              )}
            </div>
            
            {aiAnalysis?.company_culture && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Kultura organizacyjna</p>
                <p className="text-sm">{aiAnalysis.company_culture}</p>
              </div>
            )}
            
            {aiAnalysis?.founding_story && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Historia firmy</p>
                <p className="text-sm">{aiAnalysis.founding_story}</p>
              </div>
            )}
          </TabsContent>

          {/* NEWS TAB */}
          <TabsContent value="news" className="mt-4 space-y-4">
            {aiAnalysis?.sentiment && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Ogólny sentyment:</p>
                {sentimentBadge(aiAnalysis.sentiment)}
              </div>
            )}
            
            {aiAnalysis?.recent_news && aiAnalysis.recent_news.length > 0 ? (
              <div className="space-y-3">
                {aiAnalysis.recent_news.map((news, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{news.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{news.summary}</p>
                      </div>
                      {news.date && (
                        <Badge variant="outline" className="text-xs shrink-0">{news.date}</Badge>
                      )}
                    </div>
                    {news.source && (
                      <a 
                        href={news.source.startsWith('http') ? news.source : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                      >
                        {news.source.startsWith('http') ? 'Źródło →' : news.source}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Brak ostatnich wiadomości</p>
            )}
            
            {aiAnalysis?.market_signals && aiAnalysis.market_signals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Sygnały rynkowe</p>
                <ul className="space-y-1">
                  {aiAnalysis.market_signals.map((signal, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 text-primary mt-1 shrink-0" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* REGISTRY TAB */}
          <TabsContent value="registry" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {aiAnalysis?.nip && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">NIP</p>
                  <p className="text-sm font-mono">{aiAnalysis.nip}</p>
                </div>
              )}
              {aiAnalysis?.regon && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">REGON</p>
                  <p className="text-sm font-mono">{aiAnalysis.regon}</p>
                </div>
              )}
              {aiAnalysis?.krs && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">KRS</p>
                  <p className="text-sm font-mono">{aiAnalysis.krs}</p>
                </div>
              )}
            </div>
            
            {(aiAnalysis?.address || aiAnalysis?.city) && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Adres siedziby</p>
                <p className="text-sm">
                  {[aiAnalysis.address, aiAnalysis.postal_code, aiAnalysis.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
            
            {!aiAnalysis?.nip && !aiAnalysis?.regon && !aiAnalysis?.krs && !aiAnalysis?.address && (
              <p className="text-sm text-muted-foreground italic">Brak danych rejestrowych w źródłach</p>
            )}
            
            <Separator />
            
            {/* Sources */}
            {aiAnalysis?.sources && aiAnalysis.sources.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Źródła danych</p>
                <div className="space-y-1">
                  {aiAnalysis.sources.slice(0, 10).map((source, i) => (
                    <a 
                      key={i}
                      href={source.startsWith('http') ? source : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block truncate"
                    >
                      {source}
                    </a>
                  ))}
                  {aiAnalysis.sources.length > 10 && (
                    <p className="text-xs text-muted-foreground">...i {aiAnalysis.sources.length - 10} więcej</p>
                  )}
                </div>
              </div>
            )}
            
            {aiAnalysis?.analysis_notes && aiAnalysis.analysis_notes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Uwagi o danych</p>
                <ul className="space-y-1">
                  {aiAnalysis.analysis_notes.map((note, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span>•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

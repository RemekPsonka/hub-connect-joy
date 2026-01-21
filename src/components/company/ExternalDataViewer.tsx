import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  RefreshCw, Loader2, Search, Newspaper, Handshake, 
  Award, MessageSquare, Linkedin, TrendingUp, AlertTriangle,
  ExternalLink, FileText, History, Users, Cpu, ChevronDown, ChevronUp,
  Building2, Globe, BookOpen, Star, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface ExternalDataViewerProps {
  data: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Component to render full AI analysis with markdown
function AnalysisSection({ 
  title, 
  icon: Icon, 
  content, 
  defaultExpanded = true 
}: { 
  title: string; 
  icon: React.ElementType; 
  content: string | null | undefined;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!content) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Brak danych w tej sekcji</p>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{title}</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                h2: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>,
                h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>,
                p: ({ children }) => <p className="mb-2 text-sm leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Summary card for structured data
function DataSummaryCard({ 
  title, 
  icon: Icon, 
  items, 
  renderItem 
}: { 
  title: string; 
  icon: React.ElementType; 
  items: any[]; 
  renderItem: (item: any, idx: number) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {items.map((item, idx) => renderItem(item, idx))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function ExternalDataViewer({ data, onRefresh, isRefreshing }: ExternalDataViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">Brak danych z analizy zewnętrznej</p>
        <p className="text-sm mb-4">Uruchom analizę aby zebrać informacje z publicznych źródeł</p>
        {onRefresh && (
          <Button onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Uruchom analizę zewnętrzną
          </Button>
        )}
      </div>
    );
  }

  // Extract data
  const rawAnalyses = data.raw_analyses || {};
  const pressMentions = data.press_mentions || [];
  const contracts = data.public_contracts || [];
  const partnerships = data.partnerships || [];
  const awards = data.awards_certificates || [];
  const reviews = data.customer_reviews || [];
  const linkedinInsights = data.linkedin_insights;
  const marketPosition = data.market_position;
  const redFlags = data.red_flags || [];
  const citations = data.citations || data.sources || [];
  const historyMilestones = data.history_milestones || [];
  const keyClients = data.key_clients || [];
  const technologyInfo = data.technology_info;
  const queriesExecuted = data.queries_executed || 7;

  // Calculate data richness
  const sectionsWithData = [
    rawAnalyses.news_analysis,
    rawAnalyses.contracts_analysis,
    rawAnalyses.partnerships_analysis,
    rawAnalyses.awards_analysis,
    rawAnalyses.reviews_analysis,
    rawAnalyses.linkedin_analysis,
    rawAnalyses.market_analysis,
    rawAnalyses.history_analysis,
    rawAnalyses.clients_analysis,
    rawAnalyses.technology_analysis,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Profil Biznesowy - Analiza Zewnętrzna</h3>
            <p className="text-xs text-muted-foreground">
              {queriesExecuted} zapytań • {citations.length} źródeł • {sectionsWithData} sekcji z danymi
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Odśwież
          </Button>
        )}
      </div>

      {/* Red Flags Alert */}
      {redFlags.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Sygnały ostrzegawcze ({redFlags.length})
            </h4>
            <ul className="space-y-1">
              {redFlags.map((flag: string, idx: number) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs px-2 py-1.5">
            <BookOpen className="h-3 w-3 mr-1 hidden sm:inline" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="market" className="text-xs px-2 py-1.5">
            <TrendingUp className="h-3 w-3 mr-1 hidden sm:inline" />
            Rynek
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-2 py-1.5">
            <History className="h-3 w-3 mr-1 hidden sm:inline" />
            Historia
          </TabsTrigger>
          <TabsTrigger value="clients" className="text-xs px-2 py-1.5">
            <Users className="h-3 w-3 mr-1 hidden sm:inline" />
            Klienci
          </TabsTrigger>
          <TabsTrigger value="media" className="text-xs px-2 py-1.5">
            <Newspaper className="h-3 w-3 mr-1 hidden sm:inline" />
            Media
          </TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs px-2 py-1.5">
            <FileText className="h-3 w-3 mr-1 hidden sm:inline" />
            Przetargi
          </TabsTrigger>
          <TabsTrigger value="partners" className="text-xs px-2 py-1.5">
            <Handshake className="h-3 w-3 mr-1 hidden sm:inline" />
            Partnerzy
          </TabsTrigger>
          <TabsTrigger value="tech" className="text-xs px-2 py-1.5">
            <Cpu className="h-3 w-3 mr-1 hidden sm:inline" />
            Technologie
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs px-2 py-1.5">
            <Star className="h-3 w-3 mr-1 hidden sm:inline" />
            Opinie
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs px-2 py-1.5">
            <ExternalLink className="h-3 w-3 mr-1 hidden sm:inline" />
            Źródła
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Market Position Summary */}
            {marketPosition && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Pozycja rynkowa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {marketPosition.position && (
                      <div>
                        <p className="text-muted-foreground text-xs">Pozycja</p>
                        <p className="font-medium capitalize">{marketPosition.position}</p>
                      </div>
                    )}
                    {marketPosition.market_share && (
                      <div>
                        <p className="text-muted-foreground text-xs">Udział w rynku</p>
                        <p className="font-medium">{marketPosition.market_share}</p>
                      </div>
                    )}
                    {marketPosition.ranking && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Ranking</p>
                        <p className="font-medium">{marketPosition.ranking}</p>
                      </div>
                    )}
                  </div>
                  {marketPosition.competitors?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Konkurenci:</p>
                      <div className="flex flex-wrap gap-1">
                        {marketPosition.competitors.map((c: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* LinkedIn Summary */}
            {linkedinInsights && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                    LinkedIn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {linkedinInsights.employees_count && (
                      <div>
                        <p className="text-muted-foreground text-xs">Pracownicy</p>
                        <p className="font-medium">{linkedinInsights.employees_count}</p>
                      </div>
                    )}
                    {linkedinInsights.growth && (
                      <div>
                        <p className="text-muted-foreground text-xs">Wzrost</p>
                        <p className="font-medium text-green-600">{linkedinInsights.growth}</p>
                      </div>
                    )}
                    {linkedinInsights.activity_level && (
                      <div>
                        <p className="text-muted-foreground text-xs">Aktywność</p>
                        <p className="font-medium capitalize">{linkedinInsights.activity_level}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Podsumowanie danych</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Newspaper className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{pressMentions.length}</p>
                    <p className="text-xs text-muted-foreground">Wzmianki prasowe</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{contracts.length}</p>
                    <p className="text-xs text-muted-foreground">Zamówienia publ.</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Handshake className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{partnerships.length}</p>
                    <p className="text-xs text-muted-foreground">Partnerstwa</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Award className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{awards.length}</p>
                    <p className="text-xs text-muted-foreground">Nagrody/certyfikaty</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{keyClients.length}</p>
                    <p className="text-xs text-muted-foreground">Kluczowi klienci</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Market Tab */}
        <TabsContent value="market" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Analiza pozycji rynkowej"
                icon={TrendingUp}
                content={rawAnalyses.market_analysis}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Historia i kamienie milowe"
                icon={History}
                content={rawAnalyses.history_analysis}
              />
              
              {/* Timeline visualization */}
              {historyMilestones.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Oś czasu
                  </h4>
                  <div className="relative pl-6 border-l-2 border-muted space-y-4">
                    {historyMilestones.map((milestone: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary border-2 border-background" />
                        <div className="bg-muted/50 rounded-lg p-3">
                          {milestone.year && (
                            <Badge variant="outline" className="mb-2">{milestone.year}</Badge>
                          )}
                          <p className="text-sm">{milestone.event}</p>
                          {milestone.significance && (
                            <Badge variant="secondary" className="mt-2 text-xs capitalize">
                              {milestone.significance.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Klienci i realizacje"
                icon={Users}
                content={rawAnalyses.clients_analysis}
              />
              
              {/* Key clients list */}
              {keyClients.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Kluczowi klienci ({keyClients.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {keyClients.map((client: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{client.name}</p>
                        {client.industry && (
                          <Badge variant="outline" className="mt-1 text-xs">{client.industry}</Badge>
                        )}
                        {client.project && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{client.project}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Analiza obecności medialnej"
                icon={Newspaper}
                content={rawAnalyses.news_analysis}
              />
              
              {/* Press mentions list */}
              {pressMentions.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4">Wzmianki prasowe ({pressMentions.length})</h4>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {pressMentions.map((mention: any, idx: number) => (
                        <div key={idx} className="py-2 border-b last:border-0">
                          <p className="text-sm font-medium">{mention.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {mention.source && <span>{mention.source}</span>}
                            {mention.date && <span>• {mention.date}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Zamówienia publiczne i przetargi"
                icon={FileText}
                content={rawAnalyses.contracts_analysis}
              />
              
              {/* Contracts list */}
              {contracts.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4">Znalezione kontrakty ({contracts.length})</h4>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-3">
                      {contracts.map((contract: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm">{contract.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {contract.client && (
                              <Badge variant="outline" className="text-xs">{contract.client}</Badge>
                            )}
                            {contract.value && (
                              <Badge variant="secondary" className="text-xs">{contract.value}</Badge>
                            )}
                            {contract.year && (
                              <Badge variant="outline" className="text-xs">{contract.year}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Partnerstwa i alianse"
                icon={Handshake}
                content={rawAnalyses.partnerships_analysis}
              />
              
              {/* Awards section */}
              {awards.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Nagrody i certyfikaty ({awards.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {awards.map((award: any, idx: number) => (
                      <Badge 
                        key={idx} 
                        variant={award.type === 'award' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {typeof award === 'string' ? award : award.name}
                        {award.year && ` (${award.year})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Partnerships list */}
              {partnerships.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4">Partnerzy ({partnerships.length})</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {partnerships.map((p: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{typeof p === 'string' ? p : p.partner}</p>
                        {p.type && (
                          <Badge variant="outline" className="mt-1 text-xs capitalize">{p.type}</Badge>
                        )}
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technology Tab */}
        <TabsContent value="tech" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Technologie i innowacje"
                icon={Cpu}
                content={rawAnalyses.technology_analysis}
              />
              
              {/* Technology info */}
              {technologyInfo && (
                <div className="mt-6 border-t pt-4 space-y-4">
                  {technologyInfo.technologies?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Stosowane technologie</h4>
                      <div className="flex flex-wrap gap-1">
                        {technologyInfo.technologies.map((tech: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tech}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {technologyInfo.innovations?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Innowacje</h4>
                      <ul className="space-y-1">
                        {technologyInfo.innovations.map((inn: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {inn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {technologyInfo.patents?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Patenty</h4>
                      <ul className="space-y-1">
                        {technologyInfo.patents.map((patent: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {patent}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {technologyInfo.rnd_focus && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Fokus R&D</h4>
                      <p className="text-sm text-muted-foreground">{technologyInfo.rnd_focus}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <AnalysisSection
                title="Opinie i reputacja"
                icon={Star}
                content={rawAnalyses.reviews_analysis}
              />
              
              {/* LinkedIn section */}
              {rawAnalyses.linkedin_analysis && (
                <div className="mt-6 border-t pt-4">
                  <AnalysisSection
                    title="Insights z LinkedIn"
                    icon={Linkedin}
                    content={rawAnalyses.linkedin_analysis}
                    defaultExpanded={false}
                  />
                </div>
              )}
              
              {/* Customer reviews */}
              {reviews.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Cytaty z opinii ({reviews.length})
                  </h4>
                  <div className="space-y-3">
                    {reviews.map((review: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary/50">
                        <p className="text-sm italic">"{review.text}"</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          {review.source && <Badge variant="outline" className="text-xs">{review.source}</Badge>}
                          {review.rating && <span>Ocena: {review.rating}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Źródła danych ({citations.length})
                </h4>
              </div>
              
              {citations.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {citations.map((url: string, idx: number) => {
                      let domain = '';
                      try {
                        domain = new URL(url).hostname.replace('www.', '');
                      } catch {
                        domain = url;
                      }
                      
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-muted rounded flex items-center justify-center">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary group-hover:underline">{domain}</p>
                            <p className="text-xs text-muted-foreground truncate">{url}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Brak zapisanych źródeł
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Timestamp */}
      {data.analyzed_at && (
        <p className="text-xs text-muted-foreground text-right">
          Ostatnia analiza: {format(new Date(data.analyzed_at), "d MMMM yyyy, HH:mm", { locale: pl })}
        </p>
      )}
    </div>
  );
}

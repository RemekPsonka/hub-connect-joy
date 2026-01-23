import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  RefreshCw, Loader2, Globe, FileText, Link2, 
  Facebook, Linkedin, Twitter, Instagram, Youtube,
  ExternalLink, Briefcase, Package, Building2, FolderOpen,
  Quote, Users, History, Newspaper, MapPin, Share2,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useState } from 'react';

interface WebsiteDataViewerProps {
  data: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 transition-colors">
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium text-sm">{title}</span>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {count}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 pr-2 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ListWithLimit({ items, limit = 5, renderItem }: { items: any[]; limit?: number; renderItem: (item: any, idx: number) => React.ReactNode }) {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, limit);
  const hasMore = items.length > limit;
  
  return (
    <div className="space-y-1">
      {displayItems.map((item, idx) => renderItem(item, idx))}
      {hasMore && !showAll && (
        <button 
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline mt-1"
        >
          + {items.length - limit} więcej...
        </button>
      )}
      {hasMore && showAll && (
        <button 
          onClick={() => setShowAll(false)}
          className="text-xs text-muted-foreground hover:underline mt-1"
        >
          Pokaż mniej
        </button>
      )}
    </div>
  );
}

export function WebsiteDataViewer({ data, onRefresh, isRefreshing }: WebsiteDataViewerProps) {
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak danych ze strony WWW</p>
        {onRefresh && (
          <Button className="mt-4" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            Skanuj stronę
          </Button>
        )}
      </div>
    );
  }

  // Map data from www_data structure
  const crawledUrls = data.crawled_urls || [];
  const services = data.services || [];
  const products = data.products || [];
  const brands = data.brands || [];
  const realizations = data.realizations || [];
  const references = data.references || [];
  const managementWeb = data.management_web || [];
  const companyHistory = data.company_history;
  const latestNews = data.latest_news || [];
  const extractedAddress = data.extracted_address;
  const description = data.description;
  const socialMediaLinks = data.social_media_links || {};
  const scannedAt = data.scanned_at || data.scan_date;
  const totalPages = data.pages_scanned || crawledUrls.length;

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      default: return <Link2 className="h-4 w-4" />;
    }
  };

  const formatNewsDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, 'd MMM yyyy', { locale: pl });
    } catch {
      return dateStr;
    }
  };

  const hasContent = services.length > 0 || products.length > 0 || brands.length > 0 || 
    realizations.length > 0 || references.length > 0 || managementWeb.length > 0 ||
    companyHistory || latestNews.length > 0 || extractedAddress || description ||
    Object.keys(socialMediaLinks).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Podsumowanie ze strony WWW</h3>
          <Badge variant="secondary">
            {totalPages} stron
          </Badge>
        </div>
        {onRefresh && (
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {!hasContent && (
        <Card>
          <CardContent className="pt-4 text-center text-muted-foreground">
            <p className="text-sm">Strona przeskanowana, ale nie znaleziono strukturalnych danych.</p>
            <p className="text-xs mt-1">Spróbuj ponownie lub sprawdź przeskanowane URL-e poniżej.</p>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {description && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="O firmie" 
              icon={<FileText className="h-4 w-4" />}
              defaultOpen={true}
            >
              <p className="text-sm text-muted-foreground line-clamp-4">{description}</p>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {services.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Usługi" 
              icon={<Briefcase className="h-4 w-4" />}
              count={services.length}
              defaultOpen={true}
            >
              <ListWithLimit 
                items={services}
                limit={7}
                renderItem={(service, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{service}</span>
                  </div>
                )}
              />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Products */}
      {products.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Produkty" 
              icon={<Package className="h-4 w-4" />}
              count={products.length}
              defaultOpen={true}
            >
              <ListWithLimit 
                items={products}
                limit={7}
                renderItem={(product, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{product}</span>
                  </div>
                )}
              />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Realizations */}
      {realizations.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Realizacje" 
              icon={<FolderOpen className="h-4 w-4" />}
              count={realizations.length}
              defaultOpen={true}
            >
              <ListWithLimit 
                items={realizations}
                limit={5}
                renderItem={(realization, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm py-0.5">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{realization}</span>
                  </div>
                )}
              />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Brands / Partners */}
      {brands.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Partnerzy / Marki" 
              icon={<Building2 className="h-4 w-4" />}
              count={brands.length}
              defaultOpen={true}
            >
              <div className="flex flex-wrap gap-1.5">
                {brands.map((brand: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {brand}
                  </Badge>
                ))}
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* References */}
      {references.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Referencje" 
              icon={<Quote className="h-4 w-4" />}
              count={references.length}
              defaultOpen={false}
            >
              <ListWithLimit 
                items={references}
                limit={3}
                renderItem={(ref, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-1">
                    "{ref}"
                  </div>
                )}
              />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Management */}
      {managementWeb.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Zarząd" 
              icon={<Users className="h-4 w-4" />}
              count={managementWeb.length}
              defaultOpen={false}
            >
              <div className="space-y-1">
                {managementWeb.map((person: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{typeof person === 'string' ? person : person.name}</span>
                    {typeof person === 'object' && person.position && (
                      <span className="text-muted-foreground ml-2">— {person.position}</span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Latest News */}
      {latestNews.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Aktualności" 
              icon={<Newspaper className="h-4 w-4" />}
              count={latestNews.length}
              defaultOpen={true}
            >
              <ListWithLimit 
                items={latestNews}
                limit={5}
                renderItem={(news, idx) => (
                  <div key={idx} className="text-sm py-0.5">
                    {typeof news === 'object' ? (
                      <div className="flex gap-2">
                        {news.date && (
                          <span className="text-xs text-muted-foreground shrink-0 w-20">
                            {formatNewsDate(news.date)}
                          </span>
                        )}
                        <span className="text-muted-foreground">{news.title || news.text}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{news}</span>
                    )}
                  </div>
                )}
              />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Company History */}
      {companyHistory && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Historia firmy" 
              icon={<History className="h-4 w-4" />}
              defaultOpen={false}
            >
              <p className="text-sm text-muted-foreground">{companyHistory}</p>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Extracted Address */}
      {extractedAddress && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Adres (wykryty ze strony)" 
              icon={<MapPin className="h-4 w-4" />}
              defaultOpen={true}
            >
              <div className="text-sm text-muted-foreground">
                {typeof extractedAddress === 'object' ? (
                  <div className="space-y-0.5">
                    {extractedAddress.street && <div>{extractedAddress.street}</div>}
                    {(extractedAddress.postal_code || extractedAddress.city) && (
                      <div>
                        {extractedAddress.postal_code && `${extractedAddress.postal_code} `}
                        {extractedAddress.city}
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{extractedAddress}</span>
                )}
                <a 
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    typeof extractedAddress === 'object' 
                      ? `${extractedAddress.street || ''} ${extractedAddress.city || ''}`.trim()
                      : extractedAddress
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Otwórz w Google Maps
                </a>
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Social Media */}
      {Object.keys(socialMediaLinks).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Social Media" 
              icon={<Share2 className="h-4 w-4" />}
              count={Object.keys(socialMediaLinks).length}
              defaultOpen={true}
            >
              <div className="flex flex-wrap gap-2">
                {Object.entries(socialMediaLinks).map(([platform, url]: [string, any]) => (
                  url && (
                    <a
                      key={platform}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
                    >
                      {getSocialIcon(platform)}
                      <span className="capitalize">{platform}</span>
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  )
                ))}
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Crawled URLs - collapsed by default */}
      {crawledUrls.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <CollapsibleSection 
              title="Przeskanowane strony" 
              icon={<Globe className="h-4 w-4" />}
              count={crawledUrls.length}
              defaultOpen={false}
            >
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {crawledUrls.map((url: string, idx: number) => (
                  <a 
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-primary hover:underline truncate"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Scan stats */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
        {scannedAt && (
          <span>Skanowanie: {format(new Date(scannedAt), 'd MMM yyyy, HH:mm', { locale: pl })}</span>
        )}
      </div>
    </div>
  );
}

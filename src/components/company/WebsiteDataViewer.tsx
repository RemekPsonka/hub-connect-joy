import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  RefreshCw, Loader2, Globe, FileText, Link2, 
  Facebook, Linkedin, Twitter, Instagram, Youtube,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface WebsiteDataViewerProps {
  data: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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

  const pages = data.pages || data.scraped_pages || [];
  const socialMedia = data.social_media || {};
  const extractedContent = data.extracted_content || {};
  const scannedAt = data.scanned_at || data.scan_date;

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'about': 'O nas',
      'products': 'Produkty',
      'services': 'Usługi',
      'contact': 'Kontakt',
      'team': 'Zespół',
      'career': 'Kariera',
      'news': 'Aktualności',
      'references': 'Referencje',
      'clients': 'Klienci',
      'home': 'Strona główna',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Dane ze strony WWW</h3>
          <Badge variant="secondary">
            {data.pages_scanned || pages.length} stron
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

      {/* Extracted content sections */}
      {Object.keys(extractedContent).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Wyekstrahowana treść
            </h4>
            <div className="space-y-3">
              {Object.entries(extractedContent).map(([key, value]: [string, any]) => (
                <div key={key} className="border-b pb-3 last:border-0">
                  <p className="text-sm font-medium text-primary">{getCategoryLabel(key)}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social media links */}
      {Object.keys(socialMedia).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Social Media</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(socialMedia).map(([platform, url]: [string, any]) => (
                url && (
                  <a
                    key={platform}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {getSocialIcon(platform)}
                    <span className="text-sm capitalize">{platform}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanned pages list */}
      {pages.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Przeskanowane strony</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pages.map((page: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <a 
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate block"
                    >
                      {page.title || page.url}
                    </a>
                    {page.category && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {getCategoryLabel(page.category)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {page.word_count ? `${page.word_count} słów` : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan stats */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {data.total_words && (
          <span>Łącznie: {data.total_words.toLocaleString()} słów</span>
        )}
        {scannedAt && (
          <span>Skanowanie: {format(new Date(scannedAt), 'd MMM yyyy, HH:mm', { locale: pl })}</span>
        )}
      </div>
    </div>
  );
}

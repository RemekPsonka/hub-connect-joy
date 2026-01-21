import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle2, RefreshCw, Loader2, Building, Users, 
  MapPin, FileText, Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface SourceDataViewerProps {
  data: any;
  company: {
    name: string;
    nip?: string | null;
    krs?: string | null;
    regon?: string | null;
    legal_form?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    source_data_date?: string | null;
  };
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function SourceDataViewer({ data, company, onRefresh, isRefreshing }: SourceDataViewerProps) {
  const sourceType = data?.source || 'unknown';
  const isVerified = sourceType === 'krs_api' || sourceType === 'ceidg_api';

  const getSourceLabel = () => {
    switch (sourceType) {
      case 'krs_api': return 'KRS API';
      case 'ceidg_api': return 'CEIDG API';
      case 'perplexity': return 'Perplexity AI';
      default: return 'Nieznane';
    }
  };

  const management = data?.management || [];
  const shareholders = data?.shareholders || [];
  const pkdCodes = data?.pkd_codes || data?.pkd || [];

  return (
    <div className="space-y-4">
      {/* Header with source info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Dane rejestrowe</h3>
          {isVerified ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {getSourceLabel()}
            </Badge>
          ) : (
            <Badge variant="secondary">{getSourceLabel()}</Badge>
          )}
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

      {/* Basic registry data */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nazwa</p>
                  <p className="font-medium">{company.name}</p>
                </div>
              </div>

              {company.nip && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">NIP</p>
                      <p>{company.nip}</p>
                    </div>
                    {isVerified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              )}

              {company.krs && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">KRS</p>
                      <p>{company.krs}</p>
                    </div>
                    {sourceType === 'krs_api' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              )}

              {company.regon && (
                <div>
                  <p className="text-xs text-muted-foreground">REGON</p>
                  <p>{company.regon}</p>
                </div>
              )}

              {company.legal_form && (
                <div>
                  <p className="text-xs text-muted-foreground">Forma prawna</p>
                  <p>{company.legal_form}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(company.address || company.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Adres</p>
                    <p>{company.address}</p>
                    <p>{[company.postal_code, company.city].filter(Boolean).join(' ')}</p>
                  </div>
                </div>
              )}

              {data?.registration_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data rejestracji</p>
                    <p>{data.registration_date}</p>
                  </div>
                </div>
              )}

              {data?.company_status && (
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={data.company_status === 'active' ? 'default' : 'destructive'}>
                    {data.company_status === 'active' ? 'Aktywna' : data.company_status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management */}
      {management.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Zarząd</h4>
              <Badge variant="outline">{management.length}</Badge>
            </div>
            <div className="space-y-2">
              {management.map((person: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="font-medium">{person.name}</span>
                  <span className="text-sm text-muted-foreground">{person.position}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shareholders */}
      {shareholders.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Wspólnicy / Udziałowcy</h4>
              <Badge variant="outline">{shareholders.length}</Badge>
            </div>
            <div className="space-y-2">
              {shareholders.map((sh: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="font-medium">{sh.name}</span>
                  <div className="text-sm text-muted-foreground">
                    {sh.shares_count && <span>{sh.shares_count} udziałów</span>}
                    {sh.shares_value && <span> ({sh.shares_value} PLN)</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PKD Codes */}
      {pkdCodes.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Kody PKD</h4>
            <div className="flex flex-wrap gap-2">
              {pkdCodes.slice(0, 10).map((pkd: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {typeof pkd === 'string' ? pkd : `${pkd.code}: ${pkd.description?.slice(0, 50)}...`}
                </Badge>
              ))}
              {pkdCodes.length > 10 && (
                <Badge variant="secondary">+{pkdCodes.length - 10} więcej</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update timestamp */}
      {company.source_data_date && (
        <p className="text-xs text-muted-foreground">
          Ostatnia weryfikacja: {format(new Date(company.source_data_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
        </p>
      )}
    </div>
  );
}

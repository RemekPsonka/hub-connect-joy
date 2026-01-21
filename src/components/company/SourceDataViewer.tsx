import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, RefreshCw, Loader2, Building, Users, 
  MapPin, FileText, Calendar, Landmark, Briefcase, UserCheck,
  DollarSign, GitBranch, Phone, Mail, Globe, AlertTriangle, Scale
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      case 'perplexity_only': return 'Perplexity AI';
      default: return 'Nieznane';
    }
  };

  const management = data?.management || [];
  const shareholders = data?.shareholders || [];
  const procurators = data?.procurators || [];
  const supervisoryBoard = data?.supervisory_board || [];
  const pkdCodes = data?.pkd_codes || data?.pkd || [];
  const branches = data?.branches || [];
  const dates = data?.dates || {};

  // Format currency
  const formatCurrency = (amount: number | null | undefined, currency = 'PLN') => {
    if (!amount) return null;
    return new Intl.NumberFormat('pl-PL', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };

  // Calculate ownership percentage
  const totalShares = data?.shares_total || shareholders.reduce((sum: number, s: any) => sum + (s.shares_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with source info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-lg">Dane rejestrowe</h3>
          {isVerified ? (
            <Badge className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {getSourceLabel()}
            </Badge>
          ) : (
            <Badge variant="secondary">{getSourceLabel()}</Badge>
          )}
          {data?.status && (
            <Badge 
              variant={data.status === 'AKTYWNA' ? 'default' : 'destructive'}
              className={data.status === 'AKTYWNA' ? 'bg-green-500' : ''}
            >
              {data.status}
            </Badge>
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

      {/* Basic registry data + Registry Court */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              Dane podstawowe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nazwa</p>
              <p className="font-medium">{data?.name_official || company.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(company.krs || data?.krs) && (
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">KRS</p>
                    <p className="font-mono">{company.krs || data?.krs}</p>
                  </div>
                  {sourceType === 'krs_api' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </div>
              )}

              {(company.nip || data?.nip) && (
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">NIP</p>
                    <p className="font-mono">{company.nip || data?.nip}</p>
                  </div>
                  {isVerified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </div>
              )}

              {(company.regon || data?.regon) && (
                <div>
                  <p className="text-xs text-muted-foreground">REGON</p>
                  <p className="font-mono">{company.regon || data?.regon}</p>
                </div>
              )}

              {(data?.legal_form_name || company.legal_form) && (
                <div>
                  <p className="text-xs text-muted-foreground">Forma prawna</p>
                  <p className="text-sm">{data?.legal_form_name || company.legal_form}</p>
                </div>
              )}
            </div>

            {(company.address || company.city || data?.address) && (
              <div className="flex items-start gap-2 pt-2 border-t">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Adres siedziby</p>
                  <p>{data?.address || company.address}</p>
                  <p>{[data?.postal_code || company.postal_code, data?.city || company.city].filter(Boolean).join(' ')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registry Court + Capital */}
        <div className="space-y-4">
          {(data?.registry_court || data?.registry_department) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  Sąd rejestrowy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data?.registry_court && <p className="text-sm">{data.registry_court}</p>}
                {data?.registry_department && <p className="text-sm text-muted-foreground">{data.registry_department}</p>}
                {data?.entry_number && <p className="text-xs text-muted-foreground">Wpis nr: {data.entry_number}</p>}
              </CardContent>
            </Card>
          )}

          {data?.share_capital && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Kapitał zakładowy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {formatCurrency(data.share_capital, data.share_capital_currency)}
                </p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {data?.shares_total && data?.share_unit_value && (
                    <p>Udziały: {data.shares_total.toLocaleString('pl-PL')} × {formatCurrency(data.share_unit_value, data.share_capital_currency)}</p>
                  )}
                  {data?.capital_paid_up && (
                    <p>Opłacony: {formatCurrency(data.capital_paid_up, data.share_capital_currency)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact from KRS */}
          {(data?.email_krs || data?.phone_krs || data?.website_krs) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dane kontaktowe (KRS)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data?.email_krs && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{data.email_krs}</span>
                  </div>
                )}
                {data?.phone_krs && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{data.phone_krs}</span>
                  </div>
                )}
                {data?.website_krs && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={data.website_krs} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {data.website_krs}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Management */}
      {management.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Zarząd
              <Badge variant="outline">{management.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {management.map((person: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="font-medium">{person.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{person.position}</span>
                    {person.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Procurators */}
      {procurators.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Prokurenci
              <Badge variant="outline">{procurators.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {procurators.map((person: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="font-medium">{person.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{person.type}</Badge>
                    {person.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supervisory Board */}
      {supervisoryBoard.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              Rada Nadzorcza
              <Badge variant="outline">{supervisoryBoard.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {supervisoryBoard.map((person: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="font-medium">{person.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{person.position}</span>
                    {person.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shareholders */}
      {shareholders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Wspólnicy / Udziałowcy
              <Badge variant="outline">{shareholders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa / Imię i nazwisko</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Udziały</TableHead>
                  <TableHead className="text-right">Wartość</TableHead>
                  {totalShares > 0 && <TableHead className="text-right">%</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shareholders.map((sh: any, idx: number) => {
                  const percentage = totalShares > 0 && sh.shares_count 
                    ? ((sh.shares_count / totalShares) * 100).toFixed(1) 
                    : null;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {sh.name}
                          {sh.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                        {sh.krs && <span className="text-xs text-muted-foreground">KRS: {sh.krs}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sh.type === 'company' ? 'secondary' : 'outline'}>
                          {sh.type === 'company' ? 'Firma' : 'Osoba'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {sh.shares_count?.toLocaleString('pl-PL') || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {sh.shares_value ? formatCurrency(sh.shares_value, data?.share_capital_currency) : '-'}
                      </TableCell>
                      {totalShares > 0 && (
                        <TableCell className="text-right font-medium">
                          {percentage ? `${percentage}%` : '-'}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Branches */}
      {branches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Oddziały
              <Badge variant="outline">{branches.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {branches.map((branch: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 py-2 px-3 rounded-md bg-muted/30">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[branch.address, branch.postal_code, branch.city].filter(Boolean).join(', ')}
                    </p>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Kody PKD
              <Badge variant="outline">{pkdCodes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pkdCodes.slice(0, 15).map((pkd: any, idx: number) => (
                <Badge 
                  key={idx} 
                  variant={idx === 0 ? 'default' : 'outline'} 
                  className={idx === 0 ? 'bg-primary' : ''}
                >
                  {typeof pkd === 'string' ? pkd : `${pkd.code}`}
                  {idx === 0 && ' (główny)'}
                </Badge>
              ))}
              {pkdCodes.length > 15 && (
                <Badge variant="secondary">+{pkdCodes.length - 15} więcej</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dates */}
      {(dates.registration || dates.first_entry || dates.deletion || dates.suspension_start) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Daty rejestrowe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dates.first_entry && (
                <div>
                  <p className="text-xs text-muted-foreground">Pierwszy wpis</p>
                  <p className="font-medium">{dates.first_entry}</p>
                </div>
              )}
              {dates.registration && (
                <div>
                  <p className="text-xs text-muted-foreground">Rozpoczęcie działalności</p>
                  <p className="font-medium">{dates.registration}</p>
                </div>
              )}
              {dates.suspension_start && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    Data zawieszenia
                  </p>
                  <p className="font-medium text-yellow-600">{dates.suspension_start}</p>
                </div>
              )}
              {dates.suspension_end && (
                <div>
                  <p className="text-xs text-muted-foreground">Wznowienie</p>
                  <p className="font-medium">{dates.suspension_end}</p>
                </div>
              )}
              {dates.deletion && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    Data wykreślenia
                  </p>
                  <p className="font-medium text-destructive">{dates.deletion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update timestamp */}
      {company.source_data_date && (
        <p className="text-xs text-muted-foreground text-right">
          Ostatnia weryfikacja: {format(new Date(company.source_data_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
        </p>
      )}
    </div>
  );
}

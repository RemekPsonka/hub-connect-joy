import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, RefreshCw, Loader2, Building, Users, 
  MapPin, FileText, Calendar, Landmark, Briefcase, UserCheck,
  DollarSign, GitBranch, Phone, Mail, Globe, AlertTriangle, Scale,
  Link2, Gavel, FileWarning, Shield, Hash, Building2, Clock, Factory,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

// Helper to safely extract string from potentially nested KRS objects
const safeString = (value: any): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    return value?.sposobReprezentacji || value?.opis || value?.nazwa || null;
  }
  return null;
};

// Helper to extract procurator type from potentially nested KRS structure
const getProcuratorType = (type: any): string => {
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) {
    // Get latest active entry (without nrWpisuWykr = deleted)
    const activeEntries = type.filter((t: any) => !t.nrWpisuWykr);
    const latest = activeEntries[activeEntries.length - 1] || type[type.length - 1];
    return latest?.rodzajProkury || 'Prokurent';
  }
  if (typeof type === 'object' && type !== null) {
    return type?.rodzajProkury || type?.opis || 'Prokurent';
  }
  return 'Prokurent';
};

// Format currency
const formatCurrency = (amount: number | null | undefined, currency = 'PLN') => {
  if (!amount) return null;
  return new Intl.NumberFormat('pl-PL', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 2 
  }).format(amount);
};

// Section separator component
function SectionSeparator({ label, icon: Icon }: { label: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 py-4">
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{label}</h3>
      <Separator className="flex-1" />
    </div>
  );
}

// Empty state for sections without data
function EmptySection({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{title}</span>
          <Badge variant="outline" className="ml-auto">Brak danych</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function SourceDataViewer({ data, company, onRefresh, isRefreshing }: SourceDataViewerProps) {
  const [isPkdExpanded, setIsPkdExpanded] = useState(false);
  const [isBranchesExpanded, setIsBranchesExpanded] = useState(false);
  
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

  // Extract all data fields
  const management = data?.management || [];
  const shareholders = data?.shareholders || [];
  const procurators = data?.procurators || [];
  const supervisoryBoard = data?.supervisory_board || [];
  const pkdCodes = data?.pkd_codes || data?.pkd || [];
  const pkdWithDescriptions = data?.pkd_with_descriptions || [];
  const industry = data?.industry || null;
  const pkdMainDescription = data?.pkd_main_description || null;
  const branches = data?.branches || [];
  const dates = data?.dates || {};
  const representationRules = safeString(data?.representation_rules);
  const correspondenceAddress = data?.correspondence_address;
  const correspondenceCity = data?.correspondence_city;
  const correspondencePostalCode = data?.correspondence_postal_code;
  const relatedEntities = data?.related_entities || [];
  const hasCapitalGroup = data?.has_capital_group || false;
  const capitalGroupReportsCount = data?.capital_group_reports_count || 0;
  const courtMentions = data?.court_mentions || [];
  const caseSignatures = data?.case_signatures || [];
  
  // Calculate ownership percentage
  const totalShares = data?.shares_total || shareholders.reduce((sum: number, s: any) => sum + (s.shares_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with source info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Dane rejestrowe</h2>
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
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Odśwież</span>
          </Button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DZIAŁ 1: DANE PODMIOTU */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionSeparator label="Dział 1: Dane podmiotu" icon={Building2} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Identyfikacja */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              Identyfikacja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nazwa oficjalna</p>
              <p className="font-medium">{data?.name_official || company.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">KRS</p>
                  <p className="font-mono text-sm">{company.krs || data?.krs || <span className="text-muted-foreground">—</span>}</p>
                </div>
                {(company.krs || data?.krs) && sourceType === 'krs_api' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">NIP</p>
                  <p className="font-mono text-sm">{company.nip || data?.nip || <span className="text-muted-foreground">—</span>}</p>
                </div>
                {(company.nip || data?.nip) && isVerified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">REGON</p>
                <p className="font-mono text-sm">{company.regon || data?.regon || <span className="text-muted-foreground">—</span>}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Forma prawna</p>
                <p className="text-sm">{data?.legal_form_name || company.legal_form || <span className="text-muted-foreground">—</span>}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sąd rejestrowy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              Sąd rejestrowy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.registry_court ? (
              <>
                <p className="text-sm">{data.registry_court}</p>
                {data?.registry_department && <p className="text-sm text-muted-foreground">{data.registry_department}</p>}
                {data?.entry_number && <p className="text-xs text-muted-foreground">Numer wpisu: {data.entry_number}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych o sądzie rejestrowym</p>
            )}
          </CardContent>
        </Card>

        {/* Adres siedziby */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Adres siedziby
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(company.address || company.city || data?.address) ? (
              <div>
                <p>{data?.address || company.address}</p>
                <p>{[data?.postal_code || company.postal_code, data?.city || company.city].filter(Boolean).join(' ')}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych adresowych</p>
            )}
          </CardContent>
        </Card>

        {/* Kapitał zakładowy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Kapitał zakładowy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.share_capital ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych o kapitale</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daty rejestrowe */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Daty rejestrowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Pierwszy wpis</p>
              <p className="font-medium">{dates.first_entry || <span className="text-muted-foreground">—</span>}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rozpoczęcie działalności</p>
              <p className="font-medium">{dates.registration || <span className="text-muted-foreground">—</span>}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {dates.suspension_start && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                Data zawieszenia
              </p>
              <p className={`font-medium ${dates.suspension_start ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {dates.suspension_start || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {dates.deletion && <AlertTriangle className="h-3 w-3 text-destructive" />}
                Data wykreślenia
              </p>
              <p className={`font-medium ${dates.deletion ? 'text-destructive' : 'text-muted-foreground'}`}>
                {dates.deletion || '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DZIAŁ 2: ORGANY SPÓŁKI */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionSeparator label="Dział 2: Organy spółki" icon={Users} />

      {/* Zarząd */}
      {management.length > 0 ? (
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
      ) : (
        <EmptySection title="Zarząd" icon={Users} />
      )}

      {/* Sposób reprezentacji */}
      {representationRules ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Sposób reprezentacji
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{representationRules}</p>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Sposób reprezentacji" icon={Shield} />
      )}

      {/* Prokurenci */}
      {procurators.length > 0 ? (
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
                    <Badge variant="secondary" className="text-xs">{getProcuratorType(person.type)}</Badge>
                    {person.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Prokurenci" icon={UserCheck} />
      )}

      {/* Rada Nadzorcza */}
      {supervisoryBoard.length > 0 ? (
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
      ) : (
        <EmptySection title="Rada Nadzorcza" icon={Scale} />
      )}

      {/* Wspólnicy / Udziałowcy */}
      {shareholders.length > 0 ? (
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
                        {sh.shares_count?.toLocaleString('pl-PL') || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {sh.shares_value ? formatCurrency(sh.shares_value, data?.share_capital_currency) : '—'}
                      </TableCell>
                      {totalShares > 0 && (
                        <TableCell className="text-right font-medium">
                          {percentage ? `${percentage}%` : '—'}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Wspólnicy / Udziałowcy" icon={Briefcase} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DZIAŁ 3: PRZEDMIOT DZIAŁALNOŚCI (PKD) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionSeparator label="Dział 3: Przedmiot działalności" icon={Factory} />

      {/* Branża główna */}
      {industry ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Branża</p>
                <p className="text-lg font-semibold text-primary">{industry}</p>
              </div>
              {(pkdMainDescription || data?.pkd_main) && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Główne PKD</p>
                  <p className="text-sm">{data?.pkd_main}: {pkdMainDescription || ''}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Branża" icon={Factory} />
      )}

      {/* Kody PKD - zwijalna sekcja */}
      {pkdCodes.length > 0 || pkdWithDescriptions.length > 0 ? (
        <Card>
          <Collapsible open={isPkdExpanded} onOpenChange={setIsPkdExpanded}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Kody PKD
                <Badge variant="outline">{pkdWithDescriptions.length || pkdCodes.length}</Badge>
                {(pkdWithDescriptions.length > 5 || pkdCodes.length > 5) && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isPkdExpanded && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pkdWithDescriptions.length > 0 ? (
                <div className="space-y-2">
                  {/* Pierwsze 5 kodów - zawsze widoczne, wyróżnione jako główne do analizy */}
                  <div className="space-y-1.5">
                    {pkdWithDescriptions.slice(0, 5).map((pkd: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-start gap-2 py-1.5 px-2 rounded",
                          pkd.is_main ? "bg-primary/10 border border-primary/20" : "bg-muted/40"
                        )}
                      >
                        <Badge 
                          variant={pkd.is_main ? 'default' : 'secondary'} 
                          className="shrink-0"
                        >
                          {pkd.code}
                        </Badge>
                        <span className="text-sm flex-1">{pkd.description || ''}</span>
                        {pkd.is_main && (
                          <Badge variant="outline" className="text-xs shrink-0">przeważająca</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pozostałe kody - zwijane */}
                  {pkdWithDescriptions.length > 5 && (
                    <CollapsibleContent className="space-y-1 pt-2 border-t border-dashed">
                      {pkdWithDescriptions.slice(5).map((pkd: any, idx: number) => (
                        <div 
                          key={idx + 5} 
                          className="flex items-start gap-2 py-1 px-2 text-sm text-muted-foreground"
                        >
                          <Badge variant="outline" className="shrink-0 text-xs">{pkd.code}</Badge>
                          <span>{pkd.description || ''}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Fallback for pkdCodes without descriptions */}
                  <div className="flex flex-wrap gap-2">
                    {pkdCodes.slice(0, 5).map((pkd: any, idx: number) => (
                      <Badge 
                        key={idx} 
                        variant={idx === 0 ? 'default' : 'secondary'} 
                      >
                        {typeof pkd === 'string' ? pkd : `${pkd.code}`}
                        {idx === 0 && ' (główny)'}
                      </Badge>
                    ))}
                  </div>
                  {pkdCodes.length > 5 && (
                    <CollapsibleContent className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                      {pkdCodes.slice(5).map((pkd: any, idx: number) => (
                        <Badge 
                          key={idx + 5} 
                          variant="outline"
                        >
                          {typeof pkd === 'string' ? pkd : `${pkd.code}`}
                        </Badge>
                      ))}
                    </CollapsibleContent>
                  )}
                </div>
              )}
            </CardContent>
          </Collapsible>
        </Card>
      ) : (
        <EmptySection title="Kody PKD" icon={FileText} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DZIAŁ 4: POWIĄZANIA KAPITAŁOWE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionSeparator label="Dział 4: Powiązania kapitałowe" icon={Link2} />

      {/* Podmioty powiązane / Capital group info */}
      {relatedEntities.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Podmioty powiązane
              <Badge variant="outline">{relatedEntities.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedEntities.map((entity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <div>
                    <p className="font-medium">{entity.name}</p>
                    {entity.krs && <p className="text-xs text-muted-foreground">KRS: {entity.krs}</p>}
                  </div>
                  <Badge variant={entity.type === 'parent' ? 'default' : 'secondary'}>
                    {entity.type === 'parent' ? 'Dominujący' : entity.type === 'subsidiary' ? 'Zależny' : 'Powiązany'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : hasCapitalGroup ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Grupa kapitałowa
              <Badge variant="secondary">{capitalGroupReportsCount} sprawozdań</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Firma składa skonsolidowane sprawozdania finansowe grupy kapitałowej</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Szczegółowa lista podmiotów powiązanych jest dostępna w złożonych do KRS sprawozdaniach finansowych. 
                API KRS nie udostępnia bezpośrednio listy spółek zależnych/powiązanych.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Podmioty powiązane" icon={Link2} />
      )}

      {/* Oddziały */}
      {branches.length > 0 ? (
        <Card>
          <Collapsible open={isBranchesExpanded} onOpenChange={setIsBranchesExpanded}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                Oddziały
                <Badge variant="outline">{branches.length}</Badge>
                {branches.length > 3 && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isBranchesExpanded && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Podsumowanie - zawsze widoczne */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{branches.length} oddziałów w rejestrze</span>
              </div>
              
              {/* Lista oddziałów - zwijana */}
              <CollapsibleContent className="space-y-2 pt-3 mt-3 border-t border-dashed">
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
              </CollapsibleContent>
            </CardContent>
          </Collapsible>
        </Card>
      ) : (
        <EmptySection title="Oddziały" icon={GitBranch} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DZIAŁ 6: INFORMACJE DODATKOWE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionSeparator label="Dział 6: Informacje dodatkowe" icon={FileWarning} />

      {/* Wzmianki i postępowania sądowe */}
      {courtMentions.length > 0 ? (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gavel className="h-4 w-4 text-yellow-600" />
              Wzmianki i postępowania sądowe
              <Badge variant="destructive">{courtMentions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {courtMentions.map((mention: any, idx: number) => {
                const warningColors = {
                  critical: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
                  warning: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
                  info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                };
                const iconColors = {
                  critical: 'text-red-600',
                  warning: 'text-yellow-600',
                  info: 'text-blue-600'
                };
                const typeLabels: Record<string, string> = {
                  bankruptcy: 'Upadłość',
                  restructuring: 'Restrukturyzacja',
                  transformation: 'Przekształcenie',
                  liquidation: 'Likwidacja',
                  other: 'Wzmianka'
                };
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2 py-2 px-3 rounded-md border ${warningColors[mention.warning_level as keyof typeof warningColors] || warningColors.info}`}
                  >
                    <FileWarning className={`h-4 w-4 mt-0.5 ${iconColors[mention.warning_level as keyof typeof iconColors] || iconColors.info}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={mention.warning_level === 'critical' ? 'destructive' : 'secondary'}>
                          {typeLabels[mention.type] || mention.type}
                        </Badge>
                        {mention.date && <span className="text-xs text-muted-foreground">{mention.date}</span>}
                      </div>
                      <p className="text-sm mt-1">{mention.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Wzmianki i postępowania sądowe" icon={Gavel} />
      )}

      {/* Sygnatury spraw */}
      {caseSignatures.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Sygnatury spraw
              <Badge variant="outline">{caseSignatures.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {caseSignatures.map((sig: string, idx: number) => (
                <Badge key={idx} variant="outline" className="font-mono">
                  {sig}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptySection title="Sygnatury spraw" icon={FileText} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* KONTAKT I KORESPONDENCJA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionSeparator label="Kontakt i korespondencja" icon={Mail} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dane kontaktowe z KRS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Dane kontaktowe (KRS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{data?.email_krs || <span className="text-muted-foreground">Brak danych</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{data?.phone_krs || <span className="text-muted-foreground">Brak danych</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {data?.website_krs ? (
                <a href={data.website_krs} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {data.website_krs}
                </a>
              ) : (
                <span className="text-muted-foreground">Brak danych</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adres do korespondencji */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Adres do korespondencji
            </CardTitle>
          </CardHeader>
          <CardContent>
            {correspondenceAddress ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p>{correspondenceAddress}</p>
                  <p>{[correspondencePostalCode, correspondenceCity].filter(Boolean).join(' ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Taki sam jak siedziba lub brak danych</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update timestamp */}
      {company.source_data_date && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-4 border-t">
          <Clock className="h-3 w-3" />
          Ostatnia weryfikacja: {format(new Date(company.source_data_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
        </div>
      )}
    </div>
  );
}

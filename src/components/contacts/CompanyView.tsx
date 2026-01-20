import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building, Globe, MapPin, Users, Sparkles, Pencil, 
  Mail, Phone, Loader2, Link2, Calendar, DollarSign, Download
} from 'lucide-react';
import { 
  useCompanyContacts, 
  useRegenerateCompanyAI, 
  getCompanyLogoUrl, 
  extractEmailDomain,
  extractWebsiteDomain,
  useAssignContactsByDomain,
  useUpdateCompanyRevenue,
  useRemoveGroupCompany,
  useFetchKRS
} from '@/hooks/useCompanies';
import { CompanyModal } from './CompanyModal';
import { CompanyAnalysisViewer } from '@/components/company';
import type { ContactWithDetails } from '@/hooks/useContacts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CompanyViewProps {
  contact: ContactWithDetails;
}

const sizeLabels: Record<string, string> = {
  'micro': 'Mikro (1-9)',
  'small': 'Mała (10-49)',
  'medium': 'Średnia (50-249)',
  'large': 'Duża (250+)',
};

export function CompanyView({ contact }: CompanyViewProps) {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const company = contact.companies;
  
  // Extract email domain for contact grouping
  const emailDomain = useMemo(() => {
    return extractEmailDomain(contact.email);
  }, [contact.email]);
  
  // Also consider company website domain
  const companyDomain = useMemo(() => {
    return extractWebsiteDomain(company?.website);
  }, [company?.website]);
  
  // Use either email domain or company website domain
  const effectiveDomain = emailDomain || companyDomain;
  
  // Fetch contacts by company_id AND/OR email domain
  const { data: companyContacts = [], isLoading: isLoadingContacts } = useCompanyContacts(
    company?.id, 
    contact.id,
    effectiveDomain
  );
  
  const regenerateCompanyAI = useRegenerateCompanyAI();
  const assignContactsByDomain = useAssignContactsByDomain();
  const updateRevenue = useUpdateCompanyRevenue();
  const removeGroupCompany = useRemoveGroupCompany();
  const fetchKRS = useFetchKRS();
  
  // Count unassigned contacts (those with matching domain but no company_id)
  const unassignedContacts = useMemo(() => {
    if (!company?.id) return [];
    return companyContacts.filter(c => c.company_id !== company.id);
  }, [companyContacts, company?.id]);
  
  const handleAssignContacts = () => {
    if (!company?.id || !effectiveDomain) return;
    assignContactsByDomain.mutate({ companyId: company.id, domain: effectiveDomain });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleGenerateCompanyAI = () => {
    if (!company) return;
    regenerateCompanyAI.mutate({
      id: company.id,
      companyName: company.name,
      website: company.website,
      industryHint: company.industry,
      contactEmail: contact.email,
      existingKrs: company.krs,
      existingNip: company.nip,
    });
  };

  const handleFetchKRS = () => {
    if (!company?.krs) return;
    fetchKRS.mutate({
      companyId: company.id,
      krs: company.krs,
      ownerContactId: contact.id,
    });
  };

  // Parse AI analysis if exists
  let aiAnalysis: any = null;
  
  // ai_analysis is now JSONB, not string
  if (company?.ai_analysis && typeof company.ai_analysis === 'object') {
    aiAnalysis = company.ai_analysis;
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Brak przypisanej firmy</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {contact.company ? (
                  <>Firma "{contact.company}" nie została jeszcze powiązana z rekordem w systemie.</>
                ) : (
                  <>Ten kontakt nie ma przypisanej firmy. Możesz dodać firmę edytując kontakt.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatRevenue = (amount: number | null, currency: string | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency || 'PLN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Company Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Logo */}
            <Avatar className="h-16 w-16">
              {(company.logo_url || getCompanyLogoUrl(company.website)) ? (
                <AvatarImage 
                  src={company.logo_url || getCompanyLogoUrl(company.website) || ''} 
                  alt={company.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                <Building className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            
            {/* Company Info */}
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xl font-bold">{company.name}</h2>
                {company.short_name && company.short_name !== company.name && (
                  <p className="text-sm text-muted-foreground">({company.short_name})</p>
                )}
                {company.tagline && (
                  <p className="text-muted-foreground">{company.tagline}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {company.industry && (
                  <Badge variant="secondary">{company.industry}</Badge>
                )}
                {company.company_size && (
                  <Badge variant="outline">{sizeLabels[company.company_size] || company.company_size}</Badge>
                )}
                {company.legal_form && (
                  <Badge variant="outline">{company.legal_form}</Badge>
                )}
              </div>

              {/* Quick Info Row */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                {company.website && (
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {(company.city || company.address) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[company.address, company.postal_code, company.city].filter(Boolean).join(', ')}
                  </span>
                )}
                {company.revenue_amount && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatRevenue(company.revenue_amount, company.revenue_currency)}
                    {company.revenue_year && ` (${company.revenue_year})`}
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsCompanyModalOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edytuj
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleFetchKRS}
                  disabled={!company.krs || fetchKRS.isPending}
                  title={company.krs ? "Pobierz dane z KRS" : "Brak numeru KRS - dodaj w edycji firmy"}
                >
                  {fetchKRS.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  KRS
                </Button>
                <Button 
                  size="sm"
                  onClick={handleGenerateCompanyAI}
                  disabled={regenerateCompanyAI.isPending}
                >
                  {regenerateCompanyAI.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Analiza AI
                </Button>
              </div>
              {company.company_analysis_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Ostatnia analiza: {format(new Date(company.company_analysis_date), 'd MMM yyyy', { locale: pl })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 16-Section AI Analysis */}
      <CompanyAnalysisViewer
        analysis={aiAnalysis}
        confidenceScore={company.analysis_confidence_score || 0.5}
        missingSections={company.analysis_missing_sections || []}
        dataSources={company.analysis_data_sources as any}
        onRegenerate={handleGenerateCompanyAI}
        isRegenerating={regenerateCompanyAI.isPending}
        companyName={company.name}
        onUpdateRevenue={() => updateRevenue.mutate({ 
          companyId: company.id, 
          companyName: company.name,
          isGroup: !!(aiAnalysis?.is_group || aiAnalysis?.group_companies?.length)
        })}
        isUpdatingRevenue={updateRevenue.isPending}
        onRemoveGroupCompany={(name) => removeGroupCompany.mutate({ 
          companyId: company.id, 
          companyNameToRemove: name 
        })}
      />

      {/* People from this company */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              Osoby z tej firmy {companyContacts.length > 0 && `(${companyContacts.length})`}
            </CardTitle>
            {unassignedContacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAssignContacts}
                disabled={assignContactsByDomain.isPending}
              >
                {assignContactsByDomain.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-1" />
                    Przypisz {unassignedContacts.length} do firmy
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingContacts ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : companyContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Brak innych osób z tej firmy</p>
          ) : (
            <div className="space-y-2">
              {companyContacts.map((person) => {
                const isUnassigned = person.company_id !== company.id;
                return (
                  <Link
                    key={person.id}
                    to={`/contacts/${person.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(person.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{person.full_name}</p>
                        {isUnassigned && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            nieprzypisany
                          </Badge>
                        )}
                      </div>
                      {person.position && (
                        <p className="text-xs text-muted-foreground truncate">{person.position}</p>
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      {person.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{person.email}</span>
                        </span>
                      )}
                      {person.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {person.phone}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Modal */}
      <CompanyModal
        open={isCompanyModalOpen}
        onOpenChange={setIsCompanyModalOpen}
        company={company}
        ownerContactId={contact.id}
      />
    </div>
  );
}

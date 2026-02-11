import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Building, Users, Sparkles, 
  Mail, Phone, Loader2, Link2
} from 'lucide-react';
import { 
  useCompanyContacts, 
  extractEmailDomain,
  extractWebsiteDomain,
  useAssignContactsByDomain,
  useUpdateCompanyRevenue,
  useRemoveGroupCompany,
  useCreateCompanyFromDomain,
  useCreateCompanyFromName
} from '@/hooks/useCompanies';

import { CompanyFlatTabs } from '@/components/company/CompanyFlatTabs';
import type { ContactWithDetails } from '@/hooks/useContacts';

interface CompanyViewProps {
  contact: ContactWithDetails;
}

export function CompanyView({ contact }: CompanyViewProps) {
  const company = contact.companies;
  
  // Extract email domain for contact grouping
  const emailDomain = useMemo(() => {
    return extractEmailDomain(contact.email);
  }, [contact.email]);
  
  // Also consider company website domain
  const companyDomain = useMemo(() => {
    return extractWebsiteDomain(company?.website ?? null);
  }, [company?.website]);
  
  // Use either email domain or company website domain
  const effectiveDomain = emailDomain || companyDomain;
  
  // Fetch contacts by company_id AND/OR email domain
  const { data: companyContacts = [], isLoading: isLoadingContacts } = useCompanyContacts(
    company?.id, 
    contact.id,
    effectiveDomain
  );
  
  const assignContactsByDomain = useAssignContactsByDomain();
  const updateRevenue = useUpdateCompanyRevenue();
  const removeGroupCompany = useRemoveGroupCompany();
  const createCompanyFromDomain = useCreateCompanyFromDomain();
  const createCompanyFromName = useCreateCompanyFromName();
  
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

  // Parse AI analysis if exists
  const aiAnalysis = company?.ai_analysis && typeof company.ai_analysis === 'object' 
    ? company.ai_analysis 
    : null;

  if (!company) {
    // Check if contact has a business email domain
    if (emailDomain) {
      return (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Wykryto domenę firmową: {emailDomain}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Możesz utworzyć firmę na podstawie domeny email i uruchomić analizę AI.
                </p>
                <Button 
                  onClick={() => createCompanyFromDomain.mutate({ 
                    domain: emailDomain, 
                    contactId: contact.id,
                    contactEmail: contact.email || undefined
                  })}
                  disabled={createCompanyFromDomain.isPending}
                >
                  {createCompanyFromDomain.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Utwórz firmę i analizuj AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    if (contact.company) {
      return (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Firma: {contact.company}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Firma nie została jeszcze powiązana z rekordem w systemie. Utwórz rekord firmy i uruchom analizę AI.
                </p>
                <Button 
                  onClick={() => createCompanyFromName.mutate({ 
                    companyName: contact.company!, 
                    contactId: contact.id 
                  })}
                  disabled={createCompanyFromName.isPending}
                >
                  {createCompanyFromName.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Utwórz firmę „{contact.company}" i analizuj AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Brak przypisanej firmy</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ten kontakt nie ma przypisanej firmy. Możesz dodać firmę edytując kontakt.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Flat Tabs - Single layer structure */}
      <CompanyFlatTabs
        company={company}
        contactEmail={contact.email}
        onUpdateRevenue={() => updateRevenue.mutate({ 
          companyId: company.id, 
          companyName: company.name,
          isGroup: !!(aiAnalysis && typeof aiAnalysis === 'object' && !Array.isArray(aiAnalysis) && 
            ((aiAnalysis as Record<string, unknown>).is_group || 
             Array.isArray((aiAnalysis as Record<string, unknown>).group_companies)))
        })}
        isUpdatingRevenue={updateRevenue.isPending}
        onRemoveGroupCompany={(name) => removeGroupCompany.mutate({ 
          companyId: company.id, 
          companyNameToRemove: name 
        })}
      />

      {/* People from this company - always visible below tabs */}
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
    </div>
  );
}

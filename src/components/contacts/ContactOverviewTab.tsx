import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Building, MapPin, Linkedin, Tag, FileText, Globe, Users, Sparkles, Briefcase, Pencil, User } from 'lucide-react';
import { useContactStats, type ContactWithDetails } from '@/hooks/useContacts';
import { useCompanyContacts } from '@/hooks/useCompanies';
import { ContactConnectionsSection } from './ContactConnectionsSection';
import { CompanyModal } from './CompanyModal';

interface ContactOverviewTabProps {
  contact: ContactWithDetails;
}

const sourceLabels: Record<string, string> = {
  manual: 'Ręcznie',
  business_card: 'Wizytówka',
  linkedin: 'LinkedIn',
  referral: 'Polecenie',
  import: 'Import',
};

const sizeLabels: Record<string, string> = {
  'micro': 'Mikro (1-9)',
  'small': 'Mała (10-49)',
  'medium': 'Średnia (50-249)',
  'large': 'Duża (250+)',
};

export function ContactOverviewTab({ contact }: ContactOverviewTabProps) {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const { data: stats } = useContactStats(contact.id);
  const company = contact.companies;
  const { data: companyContacts = [], isLoading: isLoadingContacts } = useCompanyContacts(company?.id, contact.id);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Parse AI analysis if exists
  let aiAnalysis: {
    description?: string;
    services?: string;
    collaboration_areas?: string;
  } | null = null;
  
  if (company?.ai_analysis) {
    try {
      aiAnalysis = JSON.parse(company.ai_analysis);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats?.needs || 0}</p>
              <p className="text-sm text-muted-foreground">Otwarte potrzeby</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats?.offers || 0}</p>
              <p className="text-sm text-muted-foreground">Aktywne oferty</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats?.tasks || 0}</p>
              <p className="text-sm text-muted-foreground">Oczekujące zadania</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Summary */}
      {contact.profile_summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Profil osoby
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{contact.profile_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Contact info card */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje kontaktowe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}

            {contact.company && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Firma</p>
                  <p>{contact.company}</p>
                </div>
              </div>
            )}

            {contact.position && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Stanowisko</p>
                  <p>{contact.position}</p>
                </div>
              </div>
            )}

            {contact.city && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Miasto</p>
                  <p>{contact.city}</p>
                </div>
              </div>
            )}

            {contact.linkedin_url && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Profil LinkedIn
                  </a>
                </div>
              </div>
            )}

            {contact.source && (
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Źródło</p>
                  <p>{sourceLabels[contact.source] || contact.source}</p>
                </div>
              </div>
            )}
          </div>

          {contact.tags && contact.tags.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Tagi</p>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company card - only show if contact has a linked company */}
      {company && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Firma
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCompanyModalOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edytuj
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{company.name}</h3>
              {company.industry && (
                <Badge variant="secondary">{company.industry}</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Strona www</p>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                </div>
              )}

              {company.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Adres</p>
                    <p>{company.address}</p>
                  </div>
                </div>
              )}

              {company.employee_count && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Wielkość firmy</p>
                    <p>{sizeLabels[company.employee_count] || company.employee_count}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AI-generated company description */}
            {(company.description || aiAnalysis?.description) && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Analiza AI</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {company.description || aiAnalysis?.description}
                </p>
              </div>
            )}

            {/* Services */}
            {aiAnalysis?.services && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Usługi</p>
                </div>
                <p className="text-sm text-muted-foreground">{aiAnalysis.services}</p>
              </div>
            )}

            {/* Collaboration areas */}
            {aiAnalysis?.collaboration_areas && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Obszary współpracy</p>
                <p className="text-sm text-muted-foreground">{aiAnalysis.collaboration_areas}</p>
              </div>
            )}

            {/* People from this company */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Osoby z tej firmy {companyContacts.length > 0 && `(${companyContacts.length})`}
                </p>
              </div>
              
              {isLoadingContacts ? (
                <p className="text-sm text-muted-foreground">Ładowanie...</p>
              ) : companyContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Brak innych osób z tej firmy</p>
              ) : (
                <div className="space-y-2">
                  {companyContacts.map((person) => (
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
                        <p className="text-sm font-medium truncate">{person.full_name}</p>
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
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Modal */}
      {company && (
        <CompanyModal
          open={isCompanyModalOpen}
          onOpenChange={setIsCompanyModalOpen}
          company={company}
        />
      )}

      {/* Connections/Network section */}
      <ContactConnectionsSection contactId={contact.id} contactName={contact.full_name} />
    </div>
  );
}

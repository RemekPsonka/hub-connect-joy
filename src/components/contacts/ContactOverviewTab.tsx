import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, Phone, MapPin, Linkedin, Tag, 
  Briefcase, User, Loader2, Search
} from 'lucide-react';
import { useContactStats, type ContactWithDetails } from '@/hooks/useContacts';
import { ContactConnectionsSection } from './ContactConnectionsSection';
import { useLinkedInAnalysis } from '@/hooks/useLinkedInAnalysis';
import { LinkedInNetworkSection } from './LinkedInNetworkSection';

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

export function ContactOverviewTab({ contact }: ContactOverviewTabProps) {
  const { data: stats } = useContactStats(contact.id);
  const linkedInAnalysis = useLinkedInAnalysis();

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

      {/* ===== PERSON SECTION ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Informacje o osobie</h2>
        </div>
        <Separator />

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

              {contact.position && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
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
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">LinkedIn</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Profil LinkedIn
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => linkedInAnalysis.mutate({ 
                          contactId: contact.id, 
                          linkedinUrl: contact.linkedin_url! 
                        })}
                        disabled={linkedInAnalysis.isPending}
                      >
                        {linkedInAnalysis.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Analizuję...
                          </>
                        ) : (
                          <>
                            <Search className="h-3 w-3 mr-1" />
                            Analizuj
                          </>
                        )}
                      </Button>
                    </div>
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

      </div>

      {/* ===== LINKEDIN NETWORK SECTION ===== */}
      <div className="space-y-4">
        <Separator />
        <LinkedInNetworkSection contactId={contact.id} contactName={contact.full_name} />
      </div>

      {/* ===== CONNECTIONS SECTION ===== */}
      <div className="space-y-4">
        <Separator />
        <ContactConnectionsSection contactId={contact.id} contactName={contact.full_name} />
      </div>
    </div>
  );
}

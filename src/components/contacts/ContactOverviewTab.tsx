import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Building, MapPin, Linkedin, Tag, FileText } from 'lucide-react';
import { useContactStats, type ContactWithGroup } from '@/hooks/useContacts';
import { ContactConnectionsSection } from './ContactConnectionsSection';

interface ContactOverviewTabProps {
  contact: ContactWithGroup;
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

          {contact.profile_summary && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Podsumowanie profilu</p>
              <p className="text-sm">{contact.profile_summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connections/Network section */}
      <ContactConnectionsSection contactId={contact.id} contactName={contact.full_name} />
    </div>
  );
}

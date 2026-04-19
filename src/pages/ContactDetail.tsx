import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, User, Building, Sparkles, Target } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContact, useGenerateContactProfile } from '@/hooks/useContacts';
import { ContactDetailHeader } from '@/components/contacts/ContactDetailHeader';
import { ContactAgentSection } from '@/components/contacts/ContactAgentSection';
import { ContactNeedsOffersTab } from '@/components/contacts/ContactNeedsOffersTab';
import { ContactHistoryTab } from '@/components/contacts/ContactHistoryTab';
import { ContactTasksTab } from '@/components/contacts/ContactTasksTab';
import { ContactOverviewTab } from '@/components/contacts/ContactOverviewTab';
import { ContactOwnershipTab } from '@/components/contacts/ContactOwnershipTab';
import { ContactModal } from '@/components/contacts/ContactModal';
import { CompanyView } from '@/components/contacts/CompanyView';
import { ContactNotesPanel } from '@/components/contacts/ContactNotesPanel';
import { ContactTasksPanel } from '@/components/contacts/ContactTasksPanel';
import { ContactCompanyCard } from '@/components/contacts/ContactCompanyCard';
import { ContactQuickStats } from '@/components/contacts/ContactQuickStats';
import { MeetingsTab } from '@/components/contacts/MeetingsTab';
import { ContactConnectionsSection } from '@/components/contacts/ContactConnectionsSection';
import { ContactKnowledgeTimeline } from '@/components/contacts/ContactKnowledgeTimeline';
import { LinkedInNetworkSection } from '@/components/contacts/LinkedInNetworkSection';
import { AIProfileRenderer } from '@/components/contacts/AIProfileRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { ContactWantedTab } from '@/components/contacts/ContactWantedTab';
import { ContactEmailsTab } from '@/components/contacts/ContactEmailsTab';
import { ContactDealsPanel } from '@/components/contacts/ContactDealsPanel';

// List of public email domains that should not enable company view
const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.pl', 'outlook.com', 
  'hotmail.com', 'live.com', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl',
  'op.pl', 'tlen.pl', 'gazeta.pl', 'poczta.fm', 'icloud.com', 'protonmail.com'
];

function hasBusinessEmailDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return !PUBLIC_EMAIL_DOMAINS.includes(domain);
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { director, isAssistant } = useAuth();
  const { isAdmin } = useOwnerPanel();
  const { data: contact, isLoading, error } = useContact(id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'person' | 'company'>('person');
  const generateContactProfile = useGenerateContactProfile();

  const getDefaultTab = () => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && !isAssistant) {
      const validTabs = ['meetings', 'needs-offers', 'wanted', 'profile-ai', 'more'];
      if (validTabs.includes(tabFromUrl)) {
        return tabFromUrl;
      }
      // Legacy compatibility
      if (tabFromUrl === 'consultations') return 'meetings';
      if (tabFromUrl === 'bi') return 'meetings';
      if (tabFromUrl === 'company') return 'meetings';
      if (tabFromUrl === 'network') return 'meetings';
    }
    return 'meetings';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">Nie znaleziono kontaktu</p>
        <button
          onClick={() => navigate('/contacts')}
          className="text-primary hover:underline"
        >
          Powrót do kontaktów
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/contacts">Kontakty</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{contact.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ContactDetailHeader
        contact={contact}
        onEdit={() => setIsEditModalOpen(true)}
        viewMode={viewMode}
      />

      {!isAssistant && <ContactDealsPanel contactId={contact.id} />}

      {/* Main View Toggle: OSOBA / FIRMA */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'person' ? 'default' : 'outline'}
          onClick={() => setViewMode('person')}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          OSOBA
        </Button>
        <Button
          variant={viewMode === 'company' ? 'default' : 'outline'}
          onClick={() => setViewMode('company')}
          className="gap-2"
          disabled={!contact.companies && !contact.company && !hasBusinessEmailDomain(contact.email)}
        >
          <Building className="h-4 w-4" />
          FIRMA
        </Button>
      </div>

      {/* Content based on viewMode */}
      {viewMode === 'person' ? (
        isAssistant ? (
          /* Asystent widzi tylko Agent AI */
          <ContactAgentSection contactId={contact.id} contactName={contact.full_name} />
        ) : (
          /* Split View Layout */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEWA KOLUMNA — 60% */}
            <div className="flex-1 lg:w-[60%] space-y-6 min-w-0">
              {/* AGENT AI — na górze lewej kolumny */}
              <ContactAgentSection contactId={contact.id} contactName={contact.full_name} />

              {/* TABY z resztą treści */}
              <Tabs defaultValue={getDefaultTab()} className="w-full">
                <TabsList className="inline-flex h-auto flex-wrap gap-1 p-1 w-full lg:grid lg:grid-cols-6">
                  <TabsTrigger value="meetings">Spotkania</TabsTrigger>
                  <TabsTrigger value="needs-offers">Potrzeby</TabsTrigger>
                  <TabsTrigger value="emails">Emaile</TabsTrigger>
                  <TabsTrigger value="wanted" className="gap-1"><Target className="h-3 w-3" />Poszukiwani</TabsTrigger>
                  <TabsTrigger value="profile-ai">Profil AI</TabsTrigger>
                  <TabsTrigger value="more">Więcej</TabsTrigger>
                </TabsList>

                {/* Tab: Spotkania — BI + Konsultacje */}
                <TabsContent value="meetings" className="mt-6">
                  <MeetingsTab contactId={contact.id} contactName={contact.full_name} companyName={contact.company || undefined} />
                </TabsContent>

                {/* Tab: Potrzeby i Oferty */}
                <TabsContent value="needs-offers" className="mt-6">
                  <ContactNeedsOffersTab contactId={contact.id} />
                </TabsContent>

                {/* Tab: Emaile */}
                <TabsContent value="emails" className="mt-6">
                  <ContactEmailsTab contactId={contact.id} />
                </TabsContent>

                <TabsContent value="wanted" className="mt-6">
                  <ContactWantedTab contactId={contact.id} />
                </TabsContent>

                {/* Tab: Profil AI osoby */}
                <TabsContent value="profile-ai" className="mt-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Profil AI osoby
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateContactProfile.mutate(contact.id)}
                          disabled={generateContactProfile.isPending}
                        >
                          {generateContactProfile.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1" />
                              {contact.profile_summary ? 'Regeneruj' : 'Wygeneruj'}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {contact.profile_summary ? (
                        <AIProfileRenderer markdown={contact.profile_summary} />
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-3">
                            Brak profilu AI dla tej osoby
                          </p>
                          <Button
                            onClick={() => generateContactProfile.mutate(contact.id)}
                            disabled={generateContactProfile.isPending}
                            size="sm"
                          >
                            {generateContactProfile.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generowanie...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Wygeneruj profil AI
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Więcej — Udziały + Zadania + Historia + Przegląd */}
                <TabsContent value="more" className="mt-6">
                  <Tabs defaultValue="ownership">
                    <TabsList className="mb-4">
                      <TabsTrigger value="ownership">Udziały</TabsTrigger>
                      <TabsTrigger value="tasks-full">Zadania</TabsTrigger>
                      <TabsTrigger value="history">Historia</TabsTrigger>
                      {isAdmin && <TabsTrigger value="overview">Przegląd</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="ownership">
                      <ContactOwnershipTab contactId={contact.id} contactName={contact.full_name} />
                    </TabsContent>
                    <TabsContent value="tasks-full">
                      <ContactTasksTab contactId={contact.id} />
                    </TabsContent>
                    <TabsContent value="history">
                      <ContactHistoryTab contactId={contact.id} />
                    </TabsContent>
                    {isAdmin && (
                      <TabsContent value="overview">
                        <ContactOverviewTab contact={contact} />
                      </TabsContent>
                    )}
                  </Tabs>
                </TabsContent>
              </Tabs>
            </div>

            {/* PRAWA KOLUMNA — 40%, sticky */}
            <div className="lg:w-[40%] space-y-4 lg:sticky lg:top-4 lg:self-start">
              {/* Notatki */}
              {isAdmin && <ContactNotesPanel contact={contact} />}

              {/* Zebrana wiedza — timeline ze wszystkich źródeł */}
              <ContactKnowledgeTimeline contactId={contact.id} />

              {/* Zadania */}
              <ContactTasksPanel contactId={contact.id} />

              {/* Firma mini karta */}
              <ContactCompanyCard contact={contact} />

              {/* Szybkie statystyki */}
              <ContactQuickStats contact={contact} />

              {/* Sieć LinkedIn */}
              <LinkedInNetworkSection contactId={contact.id} contactName={contact.full_name} />

              {/* Sieć kontaktów */}
              <ContactConnectionsSection contactId={contact.id} contactName={contact.full_name} />
            </div>
          </div>
        )
      ) : (
        <CompanyView contact={contact} />
      )}

      <ContactModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        contact={contact}
      />
    </div>
  );
}

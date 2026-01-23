import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContact } from '@/hooks/useContacts';
import { ContactDetailHeader } from '@/components/contacts/ContactDetailHeader';
import { ContactOverviewTab } from '@/components/contacts/ContactOverviewTab';
import { ContactNeedsOffersTab } from '@/components/contacts/ContactNeedsOffersTab';
import { ContactConsultationsTab } from '@/components/contacts/ContactConsultationsTab';
import { ContactHistoryTab } from '@/components/contacts/ContactHistoryTab';
import { ContactTasksTab } from '@/components/contacts/ContactTasksTab';
import { ContactNotesTab } from '@/components/contacts/ContactNotesTab';
import { ContactAgentSection } from '@/components/contacts/ContactAgentSection';
import { ContactModal } from '@/components/contacts/ContactModal';
import { CompanyView } from '@/components/contacts/CompanyView';
import { ContactOwnershipTab } from '@/components/contacts/ContactOwnershipTab';
import { useAuth } from '@/contexts/AuthContext';

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
  const { director, isAssistant } = useAuth();
  const { data: contact, isLoading, error } = useContact(id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'person' | 'company'>('person');

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
      <ContactDetailHeader
        contact={contact}
        onEdit={() => setIsEditModalOpen(true)}
        viewMode={viewMode}
      />

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
        <Tabs defaultValue={isAssistant ? "agent" : "overview"} className="w-full">
          {isAssistant ? (
            <TabsList>
              <TabsTrigger value="agent">Agent AI</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="inline-flex h-auto flex-wrap gap-1 p-1 w-full lg:grid lg:grid-cols-8">
              <TabsTrigger value="overview">Przegląd</TabsTrigger>
              <TabsTrigger value="agent">Agent AI</TabsTrigger>
              <TabsTrigger value="ownership">Udziały</TabsTrigger>
              <TabsTrigger value="needs-offers">Potrzeby i Oferty</TabsTrigger>
              <TabsTrigger value="consultations">Konsultacje</TabsTrigger>
              <TabsTrigger value="history">Historia</TabsTrigger>
              <TabsTrigger value="tasks">Zadania</TabsTrigger>
              <TabsTrigger value="notes">Notatki</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="mt-6">
            <ContactOverviewTab contact={contact} />
          </TabsContent>

          <TabsContent value="agent" className="mt-6">
            <ContactAgentSection contactId={contact.id} contactName={contact.full_name} />
          </TabsContent>

          <TabsContent value="ownership" className="mt-6">
            <ContactOwnershipTab contactId={contact.id} contactName={contact.full_name} />
          </TabsContent>

          <TabsContent value="needs-offers" className="mt-6">
            <ContactNeedsOffersTab contactId={contact.id} />
          </TabsContent>

          <TabsContent value="consultations" className="mt-6">
            <ContactConsultationsTab contactId={contact.id} contactName={contact.full_name} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ContactHistoryTab contactId={contact.id} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <ContactTasksTab contactId={contact.id} />
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <ContactNotesTab contact={contact} />
          </TabsContent>
        </Tabs>
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

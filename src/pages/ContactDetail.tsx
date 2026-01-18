import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { BIInterviewChat } from '@/components/agents/BIInterviewChat';
import { BIDataViewer } from '@/components/agents/BIDataViewer';
import { useAuth } from '@/contexts/AuthContext';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { director, isAssistant } = useAuth();
  const { data: contact, isLoading, error } = useContact(id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      />

      <Tabs defaultValue={isAssistant ? "agent" : "overview"} className="w-full">
        {isAssistant ? (
          <TabsList>
            <TabsTrigger value="agent">Agent AI</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="inline-flex h-auto flex-wrap gap-1 p-1 w-full lg:grid lg:grid-cols-7">
            <TabsTrigger value="overview">Przegląd</TabsTrigger>
            <TabsTrigger value="agent">Agent AI</TabsTrigger>
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
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profil Agenta</TabsTrigger>
              <TabsTrigger value="bi-interview">Wywiad BI</TabsTrigger>
              <TabsTrigger value="bi-data">Dane BI</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ContactAgentSection contactId={contact.id} contactName={contact.full_name} />
            </TabsContent>
            
            <TabsContent value="bi-interview">
              <BIInterviewChat 
                contactId={contact.id} 
                contactName={contact.full_name}
                tenantId={director?.tenant_id}
              />
            </TabsContent>
            
            <TabsContent value="bi-data">
              <BIDataViewer contactId={contact.id} />
            </TabsContent>
          </Tabs>
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

      <ContactModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        contact={contact}
      />
    </div>
  );
}

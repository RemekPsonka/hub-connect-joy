import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactConsultationsTab } from './ContactConsultationsTab';
import { BITab } from '@/components/bi/BITab';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { ContactLinkedEvents } from './ContactLinkedEvents';
import { useGCalConnection } from '@/hooks/useGoogleCalendar';

interface MeetingsTabProps {
  contactId: string;
  contactName: string;
  companyName?: string;
}

export function MeetingsTab({ contactId, contactName, companyName }: MeetingsTabProps) {
  const { isAdmin } = useOwnerPanel();
  const { isConnected: gcalConnected } = useGCalConnection();

  return (
    <Tabs defaultValue="consultations">
      <TabsList className="mb-4">
        <TabsTrigger value="consultations">Konsultacje</TabsTrigger>
        {isAdmin && <TabsTrigger value="bi">Business Interview</TabsTrigger>}
        {gcalConnected && <TabsTrigger value="gcal">Google Calendar</TabsTrigger>}
      </TabsList>

      <TabsContent value="consultations">
        <ContactConsultationsTab contactId={contactId} contactName={contactName} />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="bi">
          <BITab contactId={contactId} contactName={contactName} companyName={companyName} />
        </TabsContent>
      )}

      {gcalConnected && (
        <TabsContent value="gcal">
          <ContactLinkedEvents contactId={contactId} />
        </TabsContent>
      )}
    </Tabs>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactConsultationsTab } from './ContactConsultationsTab';
import { ContactBI } from '@/components/bi';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { ContactLinkedEvents } from './ContactLinkedEvents';
import { useGCalConnection } from '@/hooks/useGoogleCalendar';
import { UnifiedMeetingsList } from '@/components/meetings/UnifiedMeetingsList';
import { useUnifiedMeetings } from '@/hooks/useUnifiedMeetings';

interface MeetingsTabProps {
  contactId: string;
  contactName: string;
  companyName?: string;
}

export function MeetingsTab({ contactId, contactName }: MeetingsTabProps) {
  const { isAdmin } = useOwnerPanel();
  const { isConnected: gcalConnected } = useGCalConnection();
  const { data: unified = [], isLoading: unifiedLoading } = useUnifiedMeetings({ contactId });

  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-4">
        <TabsTrigger value="all">Wszystkie spotkania</TabsTrigger>
        <TabsTrigger value="consultations">Konsultacje</TabsTrigger>
        {isAdmin && <TabsTrigger value="bi">Business Interview</TabsTrigger>}
        {gcalConnected && <TabsTrigger value="gcal">Google Calendar</TabsTrigger>}
      </TabsList>

      <TabsContent value="all">
        <UnifiedMeetingsList
          meetings={unified}
          isLoading={unifiedLoading}
          emptyText="Brak spotkań powiązanych z tym kontaktem."
        />
      </TabsContent>

      <TabsContent value="consultations">
        <ContactConsultationsTab contactId={contactId} contactName={contactName} />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="bi">
          <ContactBI contactId={contactId} contactName={contactName} />
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

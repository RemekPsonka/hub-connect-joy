import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingsHeader } from '@/components/meetings/MeetingsHeader';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { MeetingModal } from '@/components/meetings/MeetingModal';
import { UnifiedMeetingsList } from '@/components/meetings/UnifiedMeetingsList';
import { useMeetings, type MeetingsFilter } from '@/hooks/useMeetings';
import { useUnifiedMeetings, type UnifiedMeetingType } from '@/hooks/useUnifiedMeetings';

type UnifiedTab = 'all' | UnifiedMeetingType;

export default function Meetings() {
  const [filter, setFilter] = useState<MeetingsFilter>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [unifiedTab, setUnifiedTab] = useState<UnifiedTab>('all');

  const { data: meetings = [], isLoading } = useMeetings(filter);
  const { data: unified = [], isLoading: unifiedLoading } = useUnifiedMeetings({
    type: unifiedTab,
  });

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <MeetingsHeader
          filter={filter}
          onFilterChange={setFilter}
          onNewMeeting={() => setModalOpen(true)}
          meetingCount={meetings.length}
        />

        <MeetingsList meetings={meetings} filter={filter} isLoading={isLoading} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Wszystkie spotkania</h2>
          <p className="text-sm text-muted-foreground">
            Konsultacje i spotkania grupowe w jednym widoku.
          </p>
        </div>

        <Tabs value={unifiedTab} onValueChange={(v) => setUnifiedTab(v as UnifiedTab)}>
          <TabsList>
            <TabsTrigger value="all">Wszystkie</TabsTrigger>
            <TabsTrigger value="consultation">Konsultacje</TabsTrigger>
            <TabsTrigger value="group">Grupowe</TabsTrigger>
          </TabsList>

          <TabsContent value={unifiedTab} className="mt-4">
            <UnifiedMeetingsList
              meetings={unified}
              isLoading={unifiedLoading}
              emptyText="Brak spotkań w tym widoku."
            />
          </TabsContent>
        </Tabs>
      </section>

      <MeetingModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

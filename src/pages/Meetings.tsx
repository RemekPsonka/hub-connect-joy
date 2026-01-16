import { useState } from 'react';
import { MeetingsHeader } from '@/components/meetings/MeetingsHeader';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { MeetingModal } from '@/components/meetings/MeetingModal';
import { useMeetings, type MeetingsFilter } from '@/hooks/useMeetings';

export default function Meetings() {
  const [filter, setFilter] = useState<MeetingsFilter>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);

  const { data: meetings = [], isLoading } = useMeetings(filter);

  return (
    <div className="space-y-6">
      <MeetingsHeader
        filter={filter}
        onFilterChange={setFilter}
        onNewMeeting={() => setModalOpen(true)}
        meetingCount={meetings.length}
      />

      <MeetingsList
        meetings={meetings}
        filter={filter}
        isLoading={isLoading}
      />

      <MeetingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

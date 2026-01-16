import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, UsersRound } from 'lucide-react';
import type { MeetingsFilter } from '@/hooks/useMeetings';

interface MeetingsHeaderProps {
  filter: MeetingsFilter;
  onFilterChange: (filter: MeetingsFilter) => void;
  onNewMeeting: () => void;
  meetingCount: number;
}

export function MeetingsHeader({ filter, onFilterChange, onNewMeeting, meetingCount }: MeetingsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <UsersRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Spotkania grupowe</h1>
          <p className="text-sm text-muted-foreground">
            {meetingCount} {meetingCount === 1 ? 'spotkanie' : meetingCount < 5 ? 'spotkania' : 'spotkań'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as MeetingsFilter)}>
          <TabsList>
            <TabsTrigger value="upcoming">Nadchodzące</TabsTrigger>
            <TabsTrigger value="past">Poprzednie</TabsTrigger>
            <TabsTrigger value="all">Wszystkie</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={onNewMeeting} className="gap-2">
          <Plus className="h-4 w-4" />
          Nowe spotkanie
        </Button>
      </div>
    </div>
  );
}

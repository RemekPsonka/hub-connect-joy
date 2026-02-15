import { WorkspaceTimeBlock } from './WorkspaceTimeBlock';
import { Separator } from '@/components/ui/separator';

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  status?: string;
}

interface ScheduleEntry {
  time_block: number;
  project?: Project | null;
}

interface Props {
  dayOfWeek: number;
  dayName: string;
  entries: ScheduleEntry[];
  allProjects: Project[];
}

const TIME_BLOCKS = [
  { id: 0, label: '8:00 - 12:00', shortLabel: '8-12' },
  { id: 1, label: '12:00 - 16:00', shortLabel: '12-16' },
  { id: 2, label: '16:00 - 20:00', shortLabel: '16-20' },
];

export function WorkspaceDayDashboard({ dayOfWeek, dayName, entries, allProjects }: Props) {
  const entryMap = new Map(entries.map(e => [e.time_block, e]));
  const occupiedBlocks = entries.filter(e => e.project).map(e => e.time_block);

  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-foreground">{dayName}</h2>
      {TIME_BLOCKS.map((block, index) => {
        const entry = entryMap.get(block.id);
        return (
          <div key={block.id}>
            {index > 0 && <Separator className="mb-6" />}
            <WorkspaceTimeBlock
              dayOfWeek={dayOfWeek}
              timeBlock={block}
              project={entry?.project}
              allProjects={allProjects}
              occupiedBlocks={occupiedBlocks}
            />
          </div>
        );
      })}
    </div>
  );
}

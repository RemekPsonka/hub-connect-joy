import { WorkspaceTimeBlock } from './WorkspaceTimeBlock';

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

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-foreground">{dayName}</h2>
      {TIME_BLOCKS.map((block) => {
        const entry = entryMap.get(block.id);
        return (
          <WorkspaceTimeBlock
            key={block.id}
            dayOfWeek={dayOfWeek}
            timeBlock={block}
            project={entry?.project}
            allProjects={allProjects}
          />
        );
      })}
    </div>
  );
}

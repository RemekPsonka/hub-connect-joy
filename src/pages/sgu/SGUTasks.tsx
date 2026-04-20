import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSGUTasks, type SGUTaskFilter } from '@/hooks/useSGUTasks';
import { TaskRow } from '@/components/sgu/TaskRow';
import { MyKanban } from '@/components/sgu/MyKanban';
import { CalendarDays, AlertCircle, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TasksHeader } from '@/components/sgu/headers/TasksHeader';

function TaskSection({
  filter,
  label,
  icon: Icon,
  defaultOpen,
}: {
  filter: SGUTaskFilter;
  label: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
}) {
  const { data, isLoading } = useSGUTasks(filter);
  const tasks = data ?? [];

  return (
    <AccordionItem value={filter}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{label}</span>
          <Badge variant={tasks.length > 0 ? 'default' : 'secondary'}>{isLoading ? '…' : tasks.length}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Brak zadań w tej sekcji.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SGUTasks() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dziennik</h1>
        <p className="text-sm text-muted-foreground">Twoje zadania i tablica klientów.</p>
      </div>

      <TasksHeader />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="board">Tablica</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Accordion type="multiple" defaultValue={['today', 'overdue']} className="w-full">
            <TaskSection filter="today" label="Dziś" icon={CalendarDays} defaultOpen />
            <TaskSection filter="overdue" label="Zaległe" icon={AlertCircle} defaultOpen />
            <TaskSection filter="my_clients" label="Moi klienci" icon={Users} />
          </Accordion>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <MyKanban />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, StickyNote, Sparkles, CalendarDays } from 'lucide-react';
import { useUpsertWidget } from '@/hooks/useWorkspaceWidgets';
import { useCreateNote } from '@/hooks/useWorkspaceNotes';

export function AddWidgetMenu() {
  const upsert = useUpsertWidget();
  const createNote = useCreateNote();

  const add = async (type: 'kpi' | 'note' | 'ai_recs' | 'calendar') => {
    if (type === 'note') {
      const note = await createNote.mutateAsync({ title: 'Nowa notatka' });
      await upsert.mutateAsync({ widget_type: 'note', config: { note_id: note.id }, grid_w: 4, grid_h: 4 });
    } else if (type === 'kpi') {
      await upsert.mutateAsync({ widget_type: 'kpi', config: { metric: 'contacts_active', range: '30d' }, grid_w: 3, grid_h: 2 });
    } else {
      await upsert.mutateAsync({ widget_type: type, config: {}, grid_w: 4, grid_h: 3 });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Dodaj widget
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <button className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-accent text-left" onClick={() => add('kpi')}>
          <BarChart3 className="h-4 w-4" /> KPI
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-accent text-left" onClick={() => add('note')}>
          <StickyNote className="h-4 w-4" /> Notatka
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-accent text-left" onClick={() => add('ai_recs')}>
          <Sparkles className="h-4 w-4" /> Rekomendacje AI
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-accent text-left" onClick={() => add('calendar')}>
          <CalendarDays className="h-4 w-4" /> Kalendarz
        </button>
      </PopoverContent>
    </Popover>
  );
}

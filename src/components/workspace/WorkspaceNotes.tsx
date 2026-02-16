import { useState } from 'react';
import { useProjectNotes, useCreateProjectNote } from '@/hooks/useProjects';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StickyNote, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export function WorkspaceNotes({ projectId }: { projectId: string }) {
  const { data: notes = [] } = useProjectNotes(projectId);
  const createNote = useCreateProjectNote();
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createNote.mutateAsync({ projectId, content: content.trim() });
    setContent('');
    setIsAdding(false);
  };

  const recentNotes = notes.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> Notatki
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <Plus className="h-3 w-3" /> Dodaj
          </button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-1.5">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Treść notatki..."
            className="min-h-[60px] text-sm"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Escape') { setIsAdding(false); setContent(''); }
            }}
          />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || createNote.isPending} className="h-7 text-xs flex-1">
              {createNote.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Dodaj'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setContent(''); }} className="h-7 text-xs">
              Anuluj
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {recentNotes.map((note: any) => (
          <div key={note.id} className="px-2 py-1.5 rounded-md bg-muted/30 text-sm">
            <p className="text-xs whitespace-pre-wrap">{note.content}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              <span>{note.author?.full_name}</span>
              <span>{format(new Date(note.created_at), 'd MMM', { locale: pl })}</span>
            </div>
          </div>
        ))}
        {recentNotes.length === 0 && !isAdding && (
          <p className="text-xs text-muted-foreground/50 italic px-2">Brak notatek</p>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useProjectNotes, useCreateProjectNote } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ProjectNotesTabProps {
  projectId: string;
}

export function ProjectNotesTab({ projectId }: ProjectNotesTabProps) {
  const { data: notes, isLoading } = useProjectNotes(projectId);
  const createNote = useCreateProjectNote();
  const [newNote, setNewNote] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    await createNote.mutateAsync({ projectId, content: newNote.trim() });
    setNewNote('');
    setShowForm(false);
  };

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  return (
    <div className="space-y-4">
      {/* Add note */}
      {showForm ? (
        <DataCard title="Nowa notatka">
          <div className="space-y-3">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Treść notatki..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setNewNote(''); }}>
                Anuluj
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={!newNote.trim() || createNote.isPending}>
                {createNote.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Dodaj
              </Button>
            </div>
          </div>
        </DataCard>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj notatkę
        </Button>
      )}

      {/* Notes list */}
      {!notes?.length && !showForm ? (
        <DataCard>
          <EmptyState
            icon={StickyNote}
            title="Brak notatek"
            description="Dodaj pierwszą notatkę do tego projektu."
            action={{ label: 'Dodaj notatkę', onClick: () => setShowForm(true), icon: Plus }}
          />
        </DataCard>
      ) : (
        <div className="space-y-3">
          {notes?.map((note) => (
            <DataCard key={note.id}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {(note as any).author?.full_name || 'Nieznany'} · {format(new Date(note.created_at), 'd MMM yyyy HH:mm', { locale: pl })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
}

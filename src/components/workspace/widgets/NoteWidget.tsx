import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading1, List, ListChecks, Code, Pin, PinOff, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWorkspaceNote, useUpdateNote, useDeleteNote, useCreateNote } from '@/hooks/useWorkspaceNotes';
import { useUpsertWidget, useRemoveWidget } from '@/hooks/useWorkspaceWidgets';

interface Props {
  widgetId: string;
  noteId?: string | null;
}

export function NoteWidget({ widgetId, noteId }: Props) {
  const { data: note } = useWorkspaceNote(noteId ?? null);
  const update = useUpdateNote();
  const create = useCreateNote();
  const remove = useDeleteNote();
  const upsertWidget = useUpsertWidget();
  const removeWidget = useRemoveWidget();
  const [title, setTitle] = useState(note?.title ?? '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Zacznij pisać…' }),
    ],
    content: note?.blocks ?? { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] text-foreground',
      },
    },
    onUpdate: ({ editor }) => {
      if (!noteId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        update.mutate({ id: noteId, blocks: editor.getJSON() });
      }, 2000);
    },
  });

  // Sync external note → editor (only on note change, not every render)
  useEffect(() => {
    if (!editor || !note) return;
    if (!initialized.current) {
      editor.commands.setContent(note.blocks ?? { type: 'doc', content: [] }, false);
      setTitle(note.title ?? '');
      initialized.current = true;
    }
  }, [editor, note]);

  const handleCreate = async () => {
    const newNote = await create.mutateAsync({ title: 'Nowa notatka' });
    await upsertWidget.mutateAsync({ id: widgetId, widget_type: 'note', config: { note_id: newNote.id } });
  };

  const handleTitleBlur = () => {
    if (noteId && title !== note?.title) update.mutate({ id: noteId, title });
  };

  const handleDelete = async () => {
    if (noteId) await remove.mutateAsync(noteId);
    await removeWidget.mutateAsync(widgetId);
  };

  if (!noteId) {
    return (
      <Card className="h-full p-4 flex flex-col items-center justify-center text-center gap-2">
        <div className="text-sm text-muted-foreground">Brak notatki w tym widgecie</div>
        <Button size="sm" onClick={handleCreate} disabled={create.isPending}>
          Utwórz notatkę
        </Button>
        <Button size="sm" variant="ghost" onClick={() => removeWidget.mutate(widgetId)}>
          Usuń widget
        </Button>
      </Card>
    );
  }

  return (
    <Card className="h-full p-3 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-1.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Tytuł…"
          className="h-7 text-sm font-medium border-0 px-1 focus-visible:ring-0"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => note && update.mutate({ id: note.id, pinned: !note.pinned })}
          title={note?.pinned ? 'Odepnij' : 'Przypnij'}
        >
          {note?.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleDelete} title="Usuń">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {editor && (
        <div className="flex items-center gap-0.5 border-b border-border/50 pb-1">
          <Button
            size="icon"
            variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
            className="h-6 w-6"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading1 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            className="h-6 w-6"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant={editor.isActive('taskList') ? 'secondary' : 'ghost'}
            className="h-6 w-6"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecks className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
            className="h-6 w-6"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="h-3 w-3" />
          </Button>
          {update.isPending && <span className="text-[10px] text-muted-foreground ml-auto">zapisuję…</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </Card>
  );
}

import { useState } from 'react';
import { useWorkspaceTopics, useAddWorkspaceTopic, useToggleTopicResolved } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export function WorkspaceTopicsList({ projectId }: { projectId: string }) {
  const { data: topics = [] } = useWorkspaceTopics(projectId);
  const addTopic = useAddWorkspaceTopic();
  const toggleResolved = useToggleTopicResolved();
  const [newContent, setNewContent] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    addTopic.mutate({ projectId, content: newContent.trim() }, {
      onSuccess: () => setNewContent(''),
    });
  };

  const unresolved = topics.filter(t => !t.is_resolved);
  const resolved = topics.filter(t => t.is_resolved);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          Tematy do omówienia
        </h3>
        <span className="text-[10px] text-muted-foreground">{unresolved.length} otwartych</span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nowy temat..."
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 gap-1" onClick={handleAdd} disabled={addTopic.isPending}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-1">
        {unresolved.map(topic => (
          <div key={topic.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40">
            <Checkbox
              checked={false}
              onCheckedChange={() => toggleResolved.mutate({ id: topic.id, projectId, resolved: true })}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{topic.content}</p>
              <p className="text-[10px] text-muted-foreground">
                {(topic as any).author?.full_name} · {formatDistanceToNow(new Date(topic.created_at), { locale: pl, addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <>
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setShowResolved(!showResolved)}>
            {showResolved ? 'Ukryj' : 'Pokaż'} omówione ({resolved.length})
          </Button>
          {showResolved && (
            <div className="space-y-1 opacity-60">
              {resolved.map(topic => (
                <div key={topic.id} className="flex items-start gap-2 px-2 py-1.5">
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggleResolved.mutate({ id: topic.id, projectId, resolved: false })}
                    className="mt-0.5"
                  />
                  <p className="text-sm line-through">{topic.content}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

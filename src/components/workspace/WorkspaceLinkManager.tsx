import { useState } from 'react';
import { useProjectLinks, useAddProjectLink, useDeleteProjectLink } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, FileText, Github, Link2, Plus, Trash2, ExternalLink } from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: typeof Bot }> = {
  ai_project: { label: 'AI', icon: Bot },
  docs: { label: 'Docs', icon: FileText },
  repo: { label: 'Repo', icon: Github },
  other: { label: 'Link', icon: Link2 },
};

export function WorkspaceLinkManager({ projectId }: { projectId: string }) {
  const { data: links = [] } = useProjectLinks(projectId);
  const addLink = useAddProjectLink();
  const deleteLink = useDeleteProjectLink();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('ai_project');

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    addLink.mutate({ projectId, title: title.trim(), url: url.trim(), category }, {
      onSuccess: () => { setTitle(''); setUrl(''); setShowForm(false); },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Linki</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Dodaj
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/60 bg-muted/30">
          <Input placeholder="Nazwa" value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" />
          <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} className="h-8 text-sm" />
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" onClick={handleAdd} disabled={addLink.isPending}>Zapisz</Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {links.map(link => {
          const meta = CATEGORY_META[link.category] || CATEGORY_META.other;
          const Icon = meta.icon;
          return (
            <div key={link.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent/40 group transition-colors">
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-foreground hover:text-primary truncate flex-1 flex items-center gap-1"
              >
                {link.title}
                <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => deleteLink.mutate({ id: link.id, projectId })}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          );
        })}
        {links.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground/50 italic px-2">Brak linków</p>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Play, Pencil, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSGUWebSources, type SGUWebSource } from '@/hooks/useSGUWebSources';
import { WebSourceDialog } from './WebSourceDialog';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

export function WebSourcesTable() {
  const { data: sources = [], isLoading, refetch, updateMutation, deleteMutation, triggerNowMutation } = useSGUWebSources();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SGUWebSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const onAdd = () => { setEditing(null); setDialogOpen(true); };
  const onEdit = (s: SGUWebSource) => { setEditing(s); setDialogOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">Źródła web</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Odśwież
          </Button>
          <Button size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Dodaj źródło
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      ) : sources.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg text-sm">
          Brak źródeł. Dodaj pierwsze RSS/HTML/API, by zacząć scraping.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Aktywne</TableHead>
                <TableHead>Ostatni run</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
                      {s.url.slice(0, 50)}{s.url.length > 50 ? '…' : ''} <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.source_type}</Badge></TableCell>
                  <TableCell>
                    <Switch
                      checked={s.active}
                      onCheckedChange={(v) => updateMutation.mutate({ id: s.id, active: v })}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{formatDate(s.last_scraped_at)}</div>
                    {s.last_error && <div className="text-destructive truncate max-w-[180px]" title={s.last_error}>{s.last_error}</div>}
                    {!s.last_error && s.last_result_count != null && <div className="text-muted-foreground">+{s.last_result_count} kand.</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => triggerNowMutation.mutate(s.id)} title="Uruchom teraz">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onEdit(s)} title="Edytuj">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)} title="Usuń">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <WebSourceDialog open={dialogOpen} onOpenChange={setDialogOpen} source={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć źródło?</AlertDialogTitle>
            <AlertDialogDescription>Operacja nieodwracalna. Historia uruchomień zostanie usunięta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

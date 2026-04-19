import { useMemo, useState } from 'react';
import { Route, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useNetworkPath } from '@/hooks/useNetworkGraph';
import { RequestIntroButton } from './RequestIntroButton';
import type { ContactNode } from '@/hooks/useConnections';

interface Props {
  nodes: ContactNode[];
  contactsById: Record<string, { email?: string | null; company?: string | null }>;
}

export function PathExplorerPanel({ nodes, contactsById }: Props) {
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = s
      ? nodes.filter((n) => n.full_name.toLowerCase().includes(s))
      : nodes;
    return list.slice(0, 100);
  }, [nodes, search]);

  const { data: paths, isLoading } = useNetworkPath(fromId, toId, 3);
  const target = toId ? nodes.find((n) => n.id === toId) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          Ścieżka A → B
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Filtruj listę kontaktów..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={fromId ?? ''} onValueChange={(v) => setFromId(v || null)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Od kogo" />
            </SelectTrigger>
            <SelectContent>
              {filtered.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toId ?? ''} onValueChange={(v) => setToId(v || null)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Do kogo" />
            </SelectTrigger>
            <SelectContent>
              {filtered.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Szukam ścieżek...
          </div>
        )}

        {!isLoading && fromId && toId && paths && paths.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nie znaleziono ścieżki (do 3 przeskoków).
          </p>
        )}

        {!isLoading && paths && paths.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {paths.map((p, idx) => {
              const intermediates = p.path_ids.slice(1, -1);
              return (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-muted/30 p-2 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 flex-wrap text-xs">
                      {p.path_names.map((name, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="font-medium">{name || '?'}</span>
                          {i < p.path_names.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </span>
                      ))}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      siła {p.total_strength}
                    </Badge>
                  </div>
                  {intermediates.length > 0 && target && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                      {intermediates.map((mid, i) => {
                        const node = nodes.find((n) => n.id === mid);
                        const extra = contactsById[mid];
                        if (!node) return null;
                        return (
                          <RequestIntroButton
                            key={mid}
                            intermediate={{
                              id: mid,
                              full_name: node.full_name,
                              email: extra?.email,
                              company: extra?.company ?? node.company,
                            }}
                            target={{
                              full_name: target.full_name,
                              company: target.company,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

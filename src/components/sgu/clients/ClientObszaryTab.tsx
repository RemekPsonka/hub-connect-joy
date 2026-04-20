import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ClientComplexityPanel } from './ClientComplexityPanel';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  rows: SGUClientRow[];
  teamId: string;
}

export function ClientObszaryTab({ rows, teamId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const [search, setSearch] = useState('');

  const filtered = rows.filter((r) =>
    !search ? true : r.full_name.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Brak klientów</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <Card className="p-2">
        <Input
          placeholder="Szukaj klienta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8"
        />
        <ScrollArea className="h-[480px]">
          <div className="space-y-1">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                  selectedId === r.id && 'bg-accent font-medium',
                )}
              >
                <div className="truncate">{r.full_name}</div>
                {r.company && <div className="text-[10px] text-muted-foreground truncate">{r.company}</div>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Brak wyników</p>
            )}
          </div>
        </ScrollArea>
      </Card>

      <Card>
        <CardContent className="p-4">
          {selected ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold">{selected.full_name}</h3>
                {selected.company && (
                  <p className="text-xs text-muted-foreground">{selected.company}</p>
                )}
              </div>
              <ClientComplexityPanel client={selected} teamId={teamId} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Wybierz klienta z listy</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

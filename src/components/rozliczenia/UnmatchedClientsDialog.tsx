import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useGetUnmatchedClients, useMatchImportClient, useSearchCompanies } from '@/hooks/useRozliczenia';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MatchRow({
  externalCode,
  externalName,
  rowsCount,
  onMatched,
}: {
  externalCode: string;
  externalName: string | null;
  rowsCount: number;
  onMatched: () => void;
}) {
  const [q, setQ] = useState(externalName ?? '');
  const { data: companies, isLoading } = useSearchCompanies(q);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const matchMut = useMatchImportClient();

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{externalName ?? '(brak nazwy)'}</div>
          <div className="text-xs text-muted-foreground">
            Kod: <code>{externalCode}</code> • {rowsCount} {rowsCount === 1 ? 'wiersz' : 'wierszy'} czeka
          </div>
        </div>
      </div>
      <Input
        placeholder="Szukaj firmy (nazwa lub NIP)…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSelectedId(null);
        }}
      />
      <div className="max-h-48 overflow-y-auto rounded border">
        {isLoading ? (
          <div className="p-2"><Skeleton className="h-6 w-full" /></div>
        ) : companies && companies.length > 0 ? (
          companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors ${
                selectedId === c.id ? 'bg-accent' : ''
              }`}
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-muted-foreground">{c.nip ?? '—'}</div>
            </button>
          ))
        ) : (
          <div className="p-2 text-xs text-muted-foreground">Brak wyników.</div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!selectedId || matchMut.isPending}
          onClick={async () => {
            if (!selectedId) return;
            await matchMut.mutateAsync({
              external_code: externalCode,
              company_id: selectedId,
              external_name_snapshot: externalName,
            });
            onMatched();
          }}
        >
          {matchMut.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Dopasuj i przelicz
        </Button>
      </div>
    </div>
  );
}

export function UnmatchedClientsDialog({ open, onOpenChange }: Props) {
  const { data, isLoading, refetch } = useGetUnmatchedClients();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Klienci do dopasowania</DialogTitle>
          <DialogDescription>
            Te kody klientów z importu nie zostały automatycznie dopasowane.
            Wybierz firmę z systemu — po zapisaniu pozycje zostaną przeliczone i dodane do polis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : !data || data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Wszyscy klienci są dopasowani 🎉
            </div>
          ) : (
            <>
              <Badge variant="secondary">{data.length} kodów do dopasowania</Badge>
              {data.map((u) => (
                <MatchRow
                  key={u.external_code}
                  externalCode={u.external_code}
                  externalName={u.external_name}
                  rowsCount={Number(u.rows_count)}
                  onMatched={() => refetch()}
                />
              ))}
              {data.some((u) => u.earliest_seen_at) && (
                <div className="text-[10px] text-muted-foreground">
                  Najstarszy nieprzypisany: {formatDistanceToNow(new Date(data[0].earliest_seen_at!), { locale: pl, addSuffix: true })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

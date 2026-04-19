import { useMemo, useState } from 'react';
import { ExternalLink, MoreHorizontal, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useProspectingCandidates,
  type ProspectingCandidate,
} from '@/hooks/useProspectingCandidates';

interface Props {
  jobId?: string | null;
  source?: string;
}

const REJECT_REASONS = [
  { value: 'poor_fit', label: 'Słabe dopasowanie' },
  { value: 'already_customer', label: 'Już klient' },
  { value: 'wrong_pkd', label: 'Błędny PKD' },
  { value: 'no_contact_data', label: 'Brak danych kontaktowych' },
  { value: 'other', label: 'Inny' },
] as const;

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <Badge variant="outline">brak</Badge>;
  const variant = score >= 70 ? 'default' : score >= 40 ? 'secondary' : 'outline';
  const colorClass =
    score >= 70 ? 'bg-primary text-primary-foreground' : score >= 40 ? '' : 'opacity-60';
  return (
    <Badge variant={variant} className={cn('gap-1', colorClass)}>
      <Sparkles className="h-3 w-3" />
      {Math.round(score)}
    </Badge>
  );
}

export function ProspectingCandidatesList({ jobId, source }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('poor_fit');
  const [rejectNote, setRejectNote] = useState('');
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const { data: candidates = [], isLoading, acceptMutation, rejectMutation, acceptBulk, rejectBulk } =
    useProspectingCandidates({ jobId, source, status: 'pending_review' });

  const allChecked = candidates.length > 0 && candidates.every((c) => selected.has(c.id));
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleAll = (v: boolean) => {
    setSelected(v ? new Set(candidates.map((c) => c.id)) : new Set());
  };
  const toggleOne = (id: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const autoSelectTop = () => {
    const top = candidates.filter((c) => (c.ai_score ?? 0) >= 70).map((c) => c.id);
    setSelected(new Set(top));
  };
  const autoSelectLow = () => {
    const low = candidates.filter((c) => (c.ai_score ?? 0) < 50).map((c) => c.id);
    setSelected(new Set(low));
  };

  const doReject = async () => {
    if (!rejectId) return;
    const reason = rejectNote ? `${rejectReason}: ${rejectNote}` : rejectReason;
    await rejectMutation.mutateAsync({ candidateId: rejectId, reason });
    setRejectId(null);
    setRejectReason('poor_fit');
    setRejectNote('');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Brak kandydatów.</p>
        <p className="text-sm">Uruchom wyszukiwanie powyżej, aby zobaczyć propozycje.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {candidates.length} kandydatów
          {selected.size > 0 && ` · zaznaczonych: ${selected.size}`}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={autoSelectTop}>
            Zaznacz top (≥70)
          </Button>
          <Button variant="outline" size="sm" onClick={autoSelectLow}>
            Zaznacz słabe (&lt;50)
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0}
            onClick={async () => {
              await acceptBulk(selectedIds);
              setSelected(new Set());
            }}
          >
            Zaakceptuj zaznaczone ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.size === 0}
            onClick={() => setBulkRejectOpen(true)}
          >
            Odrzuć zaznaczone
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} />
              </TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>PKD</TableHead>
              <TableHead>Miasto</TableHead>
              <TableHead className="text-right">Zatrudnienie</TableHead>
              <TableHead>AI score</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c) => (
              <CandidateRow
                key={c.id}
                c={c}
                checked={selected.has(c.id)}
                onCheck={(v) => toggleOne(c.id, v)}
                onAccept={() => acceptMutation.mutate(c.id)}
                onReject={() => setRejectId(c.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Single reject dialog */}
      <AlertDialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzuć kandydata?</AlertDialogTitle>
            <AlertDialogDescription>Wybierz powód, aby ulepszać przyszłe wyszukiwania.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Komentarz (opcjonalnie)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={doReject}>Odrzuć</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk reject */}
      <AlertDialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzucić {selected.size} kandydatów?</AlertDialogTitle>
            <AlertDialogDescription>Operacja jest odwracalna (status, nie usunięcie).</AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={rejectReason} onValueChange={setRejectReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REJECT_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await rejectBulk(selectedIds, rejectReason);
                setSelected(new Set());
                setBulkRejectOpen(false);
              }}
            >
              Odrzuć wszystkie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CandidateRow({
  c,
  checked,
  onCheck,
  onAccept,
  onReject,
}: {
  c: ProspectingCandidate;
  checked: boolean;
  onCheck: (v: boolean) => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <TableRow data-state={checked ? 'selected' : undefined}>
      <TableCell>
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(!!v)} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{c.name}</span>
          <span className="text-xs text-muted-foreground">
            {c.nip ? `NIP ${c.nip}` : ''}
            {c.krs_number ? ` · KRS ${c.krs_number}` : ''}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {c.primary_pkd ?? '—'}
        </Badge>
      </TableCell>
      <TableCell>{c.address_city ?? '—'}</TableCell>
      <TableCell className="text-right">{c.employees_estimate ?? '—'}</TableCell>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="cursor-help">
              <ScoreBadge score={c.ai_score} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm">
            <p className="font-medium mb-1">Uzasadnienie AI</p>
            <p className="text-muted-foreground whitespace-pre-line">
              {c.ai_reasoning ?? 'Brak uzasadnienia'}
            </p>
            {c.ai_model && (
              <p className="mt-2 text-xs text-muted-foreground">model: {c.ai_model}</p>
            )}
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAccept}>Dodaj jako lead</DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} className="text-destructive">
              Odrzuć
            </DropdownMenuItem>
            {c.krs_number && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href={`https://rejestr.io/krs/${c.krs_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Zobacz w KRS
                  </a>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

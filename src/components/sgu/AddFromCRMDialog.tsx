import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PushToSGUDialog } from './PushToSGUDialog';

interface ContactRow {
  id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
}

interface AddFromCRMDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function AddFromCRMDialog({ open, onOpenChange }: AddFromCRMDialogProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 250);
  const [picked, setPicked] = useState<ContactRow | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setPicked(null);
    }
  }, [open]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['sgu-crm-search', debounced],
    enabled: open && debounced.length >= 2,
    queryFn: async () => {
      const pattern = `%${debounced.replace(/[%_]/g, '\\$&')}%`;
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, position, email, phone')
        .eq('is_active', true)
        .or(
          `full_name.ilike.${pattern},company.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
        )
        .order('full_name', { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });

  const minLen = debounced.length < 2;

  const empty = useMemo(
    () => !minLen && !isFetching && results.length === 0,
    [minLen, isFetching, results.length],
  );

  return (
    <>
      <Dialog open={open && !picked} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Dodaj kontakt z CRM</DialogTitle>
            <DialogDescription>
              Wyszukaj istniejący kontakt po nazwisku, firmie, e-mailu lub telefonie i przekaż go do lejka SGU.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Np. Kowalski, Cognor, jan@…"
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-72 rounded-md border">
              {minLen && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Wpisz co najmniej 2 znaki, aby rozpocząć wyszukiwanie.
                </div>
              )}
              {!minLen && isFetching && (
                <div className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Szukam…
                </div>
              )}
              {empty && (
                <div className="p-6 text-center text-sm text-muted-foreground space-y-1">
                  <p>Brak wyników w CRM dla „{debounced}".</p>
                  <p className="text-xs">
                    Jeśli kontakt jeszcze nie istnieje, użyj „Dodaj nową firmę" w toolbarze lejka.
                  </p>
                </div>
              )}
              {!minLen && !isFetching && results.length > 0 && (
                <ul className="divide-y">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setPicked(c)}
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{c.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[c.company, c.position].filter(Boolean).join(' · ') || '—'}
                          </div>
                          {(c.email || c.phone) && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {[c.email, c.phone].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="shrink-0 gap-1.5">
                          <UserPlus className="h-3.5 w-3.5" />
                          Wybierz
                        </Button>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {picked && (
        <PushToSGUDialog
          contactId={picked.id}
          contactName={picked.full_name}
          open={!!picked}
          onOpenChange={(next) => {
            if (!next) {
              setPicked(null);
              onOpenChange(false);
            }
          }}
        />
      )}
    </>
  );
}
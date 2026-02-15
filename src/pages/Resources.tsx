import { useState, useMemo } from 'react';
import { Landmark, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InstitutionCard } from '@/components/resources/InstitutionCard';
import { AddInstitutionDialog } from '@/components/resources/AddInstitutionDialog';
import { useInstitutions } from '@/hooks/useResources';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = [
  { value: 'all', label: 'Wszystkie kategorie' },
  { value: 'bank', label: 'Banki' },
  { value: 'ubezpieczyciel', label: 'Ubezpieczyciele' },
  { value: 'leasing', label: 'Leasing' },
  { value: 'kancelaria', label: 'Kancelarie' },
  { value: 'fundusz', label: 'Fundusze' },
  { value: 'inne', label: 'Inne' },
];

export default function Resources() {
  const { data: institutions, isLoading } = useInstitutions();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    if (!institutions) return [];
    return institutions.filter(inst => {
      const matchSearch = !search || inst.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || inst.category === category;
      return matchSearch && matchCategory;
    });
  }, [institutions, search, category]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Zasoby</h1>
            <p className="text-sm text-muted-foreground">Mapa instytucjonalnych połączeń</p>
          </div>
        </div>
        <AddInstitutionDialog />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj instytucji..." className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Brak instytucji</p>
          <p className="text-sm">Dodaj pierwszą instytucję, aby rozpocząć mapowanie połączeń</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(inst => <InstitutionCard key={inst.id} institution={inst} />)}
        </div>
      )}
    </div>
  );
}

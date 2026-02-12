import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDealTeams } from '@/hooks/useDealTeams';
import { useAddContactToTeam } from '@/hooks/useDealsTeamContacts';
import type { BulkContactDealTeam } from '@/hooks/useContactsDealTeamsBulk';

const CATEGORIES = ['COLD', 'LEAD', 'TOP', 'HOT', 'CLIENT'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  COLD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  LEAD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  TOP: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  HOT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CLIENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

interface DealFunnelBadgesProps {
  contactId: string;
  dealTeams: BulkContactDealTeam[];
}

export function DealFunnelBadges({ contactId, dealTeams }: DealFunnelBadgesProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { data: teams = [] } = useDealTeams();
  const addToTeam = useAddContactToTeam();

  const handleAdd = async () => {
    if (!selectedTeam || !selectedCategory) return;
    try {
      await addToTeam.mutateAsync({
        teamId: selectedTeam,
        contactId,
        category: selectedCategory.toLowerCase() as any,
      });
      setOpen(false);
      setSelectedTeam('');
      setSelectedCategory('');
    } catch {}
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {dealTeams.map((dt) => (
        <Badge
          key={dt.id}
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[dt.category.toUpperCase()] || ''}`}
        >
          {dt.team_name} · {dt.category.toUpperCase()}
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Zespół" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!selectedTeam || !selectedCategory || addToTeam.isPending}
              onClick={handleAdd}
            >
              Dodaj
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

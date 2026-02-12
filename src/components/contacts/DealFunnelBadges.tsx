import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDealTeams } from '@/hooks/useDealTeams';
import { useAddContactToTeam } from '@/hooks/useDealsTeamContacts';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import type { BulkContactDealTeam } from '@/hooks/useContactsDealTeamsBulk';
import type { DealCategory } from '@/types/dealTeam';

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
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [changingId, setChangingId] = useState<string | null>(null);
  const { data: teams = [] } = useDealTeams();
  const addToTeam = useAddContactToTeam();
  const updateContact = useUpdateTeamContact();

  const handleAdd = async () => {
    if (!selectedTeam || !selectedCategory) return;
    try {
      await addToTeam.mutateAsync({
        teamId: selectedTeam,
        contactId,
        category: selectedCategory.toLowerCase() as DealCategory,
      });
      setAddOpen(false);
      setSelectedTeam('');
      setSelectedCategory('');
    } catch {}
  };

  const handleChangeCategory = async (dt: BulkContactDealTeam, newCategory: string) => {
    if (newCategory.toUpperCase() === dt.category.toUpperCase()) {
      setChangingId(null);
      return;
    }
    try {
      await updateContact.mutateAsync({
        id: dt.id,
        teamId: dt.team_id,
        category: newCategory.toLowerCase() as DealCategory,
      });
    } catch {}
    setChangingId(null);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {dealTeams.map((dt) => (
        <Popover
          key={dt.id}
          open={changingId === dt.id}
          onOpenChange={(open) => setChangingId(open ? dt.id : null)}
        >
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity ${CATEGORY_COLORS[dt.category.toUpperCase()] || ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {dt.team_name} · {dt.category.toUpperCase()}
            </Badge>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-1.5"
            align="start"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChangeCategory(dt, c)}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                    c === dt.category.toUpperCase()
                      ? 'ring-1 ring-foreground/30 ' + (CATEGORY_COLORS[c] || '')
                      : 'hover:bg-muted ' + (CATEGORY_COLORS[c] || '')
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ))}
      <Popover open={addOpen} onOpenChange={setAddOpen}>
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

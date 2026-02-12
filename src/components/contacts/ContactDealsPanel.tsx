import { useState } from 'react';
import { TrendingUp, Plus, Loader2, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DealCategory } from '@/types/dealTeam';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactDealTeams } from '@/hooks/useContactDealTeams';
import { useMyDealTeams } from '@/hooks/useDealTeams';
import { useAddContactToTeam, useRemoveContactFromTeam, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  hot: 'bg-red-500/15 text-red-700 border-red-300',
  top: 'bg-amber-500/15 text-amber-700 border-amber-300',
  lead: 'bg-blue-500/15 text-blue-700 border-blue-300',
  cold: 'bg-slate-500/15 text-slate-700 border-slate-300',
  client: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
};

const CATEGORIES = ['cold', 'lead', 'top', 'hot', 'client'] as const;

interface ContactDealsPanelProps {
  contactId: string;
}

export function ContactDealsPanel({ contactId }: ContactDealsPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dealTeamLinks = [], isLoading } = useContactDealTeams(contactId);
  const { data: myTeams = [] } = useMyDealTeams();
  const addContact = useAddContactToTeam();
  const removeContact = useRemoveContactFromTeam();
  const updateContact = useUpdateTeamContact();

  const [open, setOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('lead');
  const [changingId, setChangingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!selectedTeamId || !selectedCategory) return;
    addContact.mutate(
      { teamId: selectedTeamId, contactId, category: selectedCategory as DealCategory },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['contact-deal-teams', contactId] });
          setOpen(false);
          setSelectedTeamId('');
          setSelectedCategory('lead');
        },
        onError: (error: Error) => {
          toast.error(`Nie udało się dodać: ${error.message}`);
        },
      },
    );
  };

  const handleRemove = (dealContactId: string, teamId: string) => {
    removeContact.mutate(
      { contactId: dealContactId, teamId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['contact-deal-teams', contactId] });
          setChangingId(null);
        },
      },
    );
  };

  const handleChangeCategory = (link: typeof dealTeamLinks[0], newCategory: string) => {
    if (newCategory === link.category) {
      setChangingId(null);
      return;
    }
    updateContact.mutate(
      { id: link.id, teamId: link.team_id, category: newCategory as DealCategory },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['contact-deal-teams', contactId] });
          setChangingId(null);
        },
      },
    );
  };

  // Teams not yet assigned (only teams user is member of)
  const assignedTeamIds = new Set(dealTeamLinks.map((l) => l.team_id));
  const availableTeams = myTeams.filter((t) => !assignedTeamIds.has(t.id));

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border bg-card px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground shrink-0">
        <TrendingUp className="h-4 w-4" />
        DEALS
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : dealTeamLinks.length === 0 ? (
        <span className="text-xs text-muted-foreground">Brak przypisania do lejka</span>
      ) : (
        dealTeamLinks.map((link) => (
          <Popover
            key={link.id}
            open={changingId === link.id}
            onOpenChange={(o) => setChangingId(o ? link.id : null)}
          >
            <PopoverTrigger asChild>
              <Badge
                variant="outline"
                className={`cursor-pointer text-xs font-medium hover:opacity-80 transition-opacity ${CATEGORY_COLORS[link.category] || CATEGORY_COLORS.lead}`}
              >
                {link.team_name} — {link.category.toUpperCase()}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 space-y-2" align="start">
              <div className="flex gap-1">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChangeCategory(link, c)}
                    className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${
                      c === link.category
                        ? 'ring-1 ring-foreground/30 ' + (CATEGORY_COLORS[c] || '')
                        : 'hover:bg-muted ' + (CATEGORY_COLORS[c] || '')
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 border-t pt-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-muted-foreground"
                  onClick={() => navigate(`/deals-team/${link.team_id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Otwórz zespół
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-destructive hover:text-destructive ml-auto"
                  onClick={() => handleRemove(link.id, link.team_id)}
                >
                  <X className="h-3 w-3" />
                  Usuń
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ))
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 ml-auto shrink-0">
            <Plus className="h-3.5 w-3.5" />
            Dodaj
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="end">
          <p className="text-sm font-medium">Dodaj do zespołu Deals</p>

          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Wybierz zespół" />
            </SelectTrigger>
            <SelectContent>
              {availableTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
              {availableTeams.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Brak dostępnych zespołów</div>
              )}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="w-full"
            disabled={!selectedTeamId || addContact.isPending}
            onClick={handleAdd}
          >
            {addContact.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Dodaj
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

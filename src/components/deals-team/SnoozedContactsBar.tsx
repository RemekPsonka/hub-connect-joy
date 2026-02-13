import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Moon, AlarmClock, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DealTeamContact } from '@/types/dealTeam';

interface SnoozedContactsBarProps {
  snoozedContacts: DealTeamContact[];
  teamId: string;
  onContactClick: (contact: DealTeamContact) => void;
}

const categoryIcons: Record<string, string> = {
  hot: '🔥', top: '⭐', lead: '📋', '10x': '🔄', cold: '❄️', lost: '✖️',
};

export function SnoozedContactsBar({ snoozedContacts, teamId, onContactClick }: SnoozedContactsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  if (snoozedContacts.length === 0) return null;

  const handleWakeUp = async (e: React.MouseEvent, contact: DealTeamContact) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('deal_team_contacts')
      .update({
        snoozed_until: null,
        snooze_reason: null,
        snoozed_from_category: null,
      } as any)
      .eq('id', contact.id);

    if (error) {
      toast.error('Błąd budzenia kontaktu');
    } else {
      toast.success(`${contact.contact?.full_name} wrócił do lejka`);
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', teamId] });
    }
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Moon className="h-3.5 w-3.5" />
        <span>Odłożone</span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {snoozedContacts.length}
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {snoozedContacts.map((contact) => {
            const returnCategory = contact.snoozed_from_category || contact.category;
            const isOverdue = contact.snoozed_until && new Date(contact.snoozed_until) <= new Date();

            return (
              <Card
                key={contact.id}
                className={cn(
                  'px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors',
                  isOverdue && 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                )}
                onClick={() => onContactClick(contact)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">
                        {categoryIcons[returnCategory] || '📋'}
                      </span>
                      <span className="text-xs font-medium truncate">
                        {contact.contact?.full_name}
                      </span>
                    </div>
                    {contact.snooze_reason && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {contact.snooze_reason}
                      </p>
                    )}
                    {contact.snoozed_until && (
                      <p className={cn(
                        'text-[10px] mt-0.5 flex items-center gap-1',
                        isOverdue ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                      )}>
                        <AlarmClock className="h-2.5 w-2.5" />
                        {isOverdue
                          ? 'Czas wrócić!'
                          : `Powrót: ${format(new Date(contact.snoozed_until), 'd MMM yyyy', { locale: pl })}`
                        }
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] shrink-0"
                    onClick={(e) => handleWakeUp(e, contact)}
                  >
                    <AlarmClock className="h-3 w-3 mr-1" />
                    Obudź
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

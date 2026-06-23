import { Loader2, UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import type { DealTeamContact } from '@/types/dealTeam';

interface AssignOwnerDialogProps {
  contact: DealTeamContact | null;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignOwnerDialog({
  contact,
  teamId,
  open,
  onOpenChange,
}: AssignOwnerDialogProps) {
  const { data: members = [], isLoading } = useTeamMembers(teamId);
  const update = useUpdateTeamContact();

  const currentOwnerId = contact?.assigned_to ?? null;

  const handlePick = async (directorId: string | null) => {
    if (!contact) return;
    await update.mutateAsync({ id: contact.id, teamId, assignedTo: directorId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Przypisz opiekuna</DialogTitle>
          <DialogDescription>
            Wybierz osobę z zespołu, która zostanie opiekunem kontaktu
            {contact?.contact?.full_name ? ` ${contact.contact.full_name}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 rounded-md border">
          {isLoading ? (
            <div className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie zespołu…
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Brak członków zespołu.
            </div>
          ) : (
            <ul className="divide-y">
              {members.map((m) => {
                const director = m.director;
                if (!director) return null;
                const isCurrent = director.id === currentOwnerId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(director.id)}
                      disabled={update.isPending}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {director.full_name}
                        </div>
                        {director.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {director.email}
                          </div>
                        )}
                      </div>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <UserCheck className="h-3.5 w-3.5" /> Aktualny
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {currentOwnerId && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePick(null)}
              disabled={update.isPending}
            >
              Usuń opiekuna
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
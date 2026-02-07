import { useState } from 'react';
import { Share2, X, UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useContactShares, useShareContact, useRevokeContactShare } from '@/hooks/useContactShares';

// Import the hook to get directors in the tenant
import { useDirectorsByTenant } from '@/hooks/useDealsTeamMembers';

interface ShareContactDialogProps {
  contactId: string;
  contactName: string;
}

export function ShareContactDialog({ contactId, contactName }: ShareContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');

  const { director } = useAuth();
  const { data: shares = [], isLoading: sharesLoading } = useContactShares(contactId);
  const { data: directors = [] } = useDirectorsByTenant();
  const shareContact = useShareContact();
  const revokeShare = useRevokeContactShare();

  // Filter out current director and already-shared directors
  const sharedDirectorIds = new Set(shares.map(s => s.shared_with_director_id));
  const availableDirectors = directors.filter(
    d => d.id !== director?.id && !sharedDirectorIds.has(d.id)
  );

  const handleShare = async () => {
    if (!selectedDirectorId) return;
    await shareContact.mutateAsync({
      contactId,
      directorId: selectedDirectorId,
      permission: selectedPermission,
    });
    setSelectedDirectorId('');
  };

  const handleRevoke = async (shareId: string) => {
    await revokeShare.mutateAsync({ shareId, contactId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="h-4 w-4" />
          Udostępnij
          {shares.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {shares.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Udostępnij kontakt</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {contactName}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Add new share */}
          {availableDirectors.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedDirectorId} onValueChange={setSelectedDirectorId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Wybierz dyrektora..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDirectors.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as 'read' | 'write')}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Odczyt</SelectItem>
                  <SelectItem value="write">Edycja</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="icon"
                onClick={handleShare}
                disabled={!selectedDirectorId || shareContact.isPending}
              >
                {shareContact.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Current shares */}
          {sharesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Kontakt nie jest udostępniony nikomu.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Udostępniony dla:</p>
              {shares.map(share => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {share.shared_with_director?.full_name || 'Nieznany'}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {share.permission === 'write' ? 'Edycja' : 'Odczyt'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(share.id)}
                    disabled={revokeShare.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

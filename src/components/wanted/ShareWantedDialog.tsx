import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShareWantedContact, useWantedContactShares, useRevokeWantedContactShare } from '@/hooks/useWantedContacts';
import { useDirectors } from '@/hooks/useDirectors';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, X, Users, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wantedId: string;
}

export function ShareWantedDialog({ open, onOpenChange, wantedId }: Props) {
  const [selectedDirector, setSelectedDirector] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [permission, setPermission] = useState('read');
  const [shareType, setShareType] = useState<'director' | 'team'>('director');

  const { director } = useAuth();
  const { data: directors } = useDirectors();
  const { data: shares, isLoading: sharesLoading } = useWantedContactShares(wantedId);
  const shareMutation = useShareWantedContact();
  const revokeMutation = useRevokeWantedContactShare();

  const { data: teams } = useQuery({
    queryKey: ['deal-teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('deal_teams').select('id, name').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const otherDirectors = directors?.filter((d) => d.id !== director?.id) || [];

  const handleShare = () => {
    const input = shareType === 'director'
      ? { wanted_contact_id: wantedId, shared_with_director_id: selectedDirector, permission }
      : { wanted_contact_id: wantedId, shared_with_team_id: selectedTeam, permission };

    shareMutation.mutate(input, {
      onSuccess: () => {
        setSelectedDirector('');
        setSelectedTeam('');
      },
    });
  };

  const canShare = shareType === 'director' ? !!selectedDirector : !!selectedTeam;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Udostępnij poszukiwanego</DialogTitle>
        </DialogHeader>

        <Tabs value={shareType} onValueChange={(v) => setShareType(v as 'director' | 'team')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="director" className="gap-1.5 text-xs"><UserCog className="h-3.5 w-3.5" /> Dyrektor</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Zespół</TabsTrigger>
          </TabsList>

          <TabsContent value="director" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Dyrektor</Label>
              <Select value={selectedDirector} onValueChange={setSelectedDirector}>
                <SelectTrigger><SelectValue placeholder="Wybierz dyrektora" /></SelectTrigger>
                <SelectContent>
                  {otherDirectors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Zespół</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger><SelectValue placeholder="Wybierz zespół" /></SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-1.5">
          <Label className="text-xs">Uprawnienie</Label>
          <Select value={permission} onValueChange={setPermission}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="read">Odczyt</SelectItem>
              <SelectItem value="write">Odczyt + edycja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleShare} disabled={!canShare || shareMutation.isPending} className="w-full">
          {shareMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
          Udostępnij
        </Button>

        {/* Current shares */}
        {shares && shares.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground">Aktualnie udostępnione</Label>
            {shares.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span>
                  {s.shared_with_director?.full_name || s.shared_with_team?.name || '?'}
                  <Badge variant="outline" className="ml-1.5 text-[10px]">{s.permission}</Badge>
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => revokeMutation.mutate(s.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zamknij</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

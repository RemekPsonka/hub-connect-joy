import { useState } from 'react';
import { Share2, Plus, Trash2, Users, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useContactGroups } from '@/hooks/useContactGroups';
import { useContactGroupShares, useAddContactGroupShare, useRemoveContactGroupShare } from '@/hooks/useContactGroupShares';
import { useDirectors } from '@/hooks/useDirectors';
import { useDealTeams } from '@/hooks/useDealTeams';

type ShareTarget = 'director' | 'team';

export function ContactGroupSharingPanel() {
  const { data: groups, isLoading: groupsLoading } = useContactGroups();
  const { data: shares, isLoading: sharesLoading } = useContactGroupShares();
  const { data: directors } = useDirectors();
  const { data: teams } = useDealTeams();
  const addShare = useAddContactGroupShare();
  const removeShare = useRemoveContactGroupShare();

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [shareType, setShareType] = useState<ShareTarget>('director');
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  const isLoading = groupsLoading || sharesLoading;

  const handleAdd = () => {
    if (!selectedGroup || !selectedTarget) return;
    
    addShare.mutate({
      groupId: selectedGroup,
      directorId: shareType === 'director' ? selectedTarget : undefined,
      teamId: shareType === 'team' ? selectedTarget : undefined,
    }, {
      onSuccess: () => {
        setSelectedTarget('');
      },
    });
  };

  const getSharesForGroup = (groupId: string) => {
    return shares?.filter(s => s.group_id === groupId) || [];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Widoczność grup kontaktów
        </CardTitle>
        <CardDescription>
          Przypisz widoczność grup kontaktów do dyrektorów lub zespołów Deals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new share form */}
        <div className="flex items-end gap-3 p-4 border rounded-lg bg-muted/30">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Grupa</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz grupę..." />
              </SelectTrigger>
              <SelectContent>
                {groups?.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      {g.color && (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                      )}
                      {g.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[140px] space-y-1.5">
            <label className="text-sm font-medium">Typ</label>
            <Select value={shareType} onValueChange={(v) => { setShareType(v as ShareTarget); setSelectedTarget(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="director">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Dyrektor
                  </div>
                </SelectItem>
                <SelectItem value="team">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Zespół
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">
              {shareType === 'director' ? 'Dyrektor' : 'Zespół'}
            </label>
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger>
                <SelectValue placeholder={shareType === 'director' ? 'Wybierz dyrektora...' : 'Wybierz zespół...'} />
              </SelectTrigger>
              <SelectContent>
                {shareType === 'director'
                  ? directors?.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))
                  : teams?.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!selectedGroup || !selectedTarget || addShare.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Dodaj
          </Button>
        </div>

        {/* Groups with shares */}
        <div className="space-y-4">
          {groups?.map(group => {
            const groupShares = getSharesForGroup(group.id);
            if (groupShares.length === 0) return null;

            return (
              <div key={group.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {group.color && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                  )}
                  <span className="font-medium">{group.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {groupShares.length} {groupShares.length === 1 ? 'udostępnienie' : 'udostępnień'}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {groupShares.map(share => (
                    <div
                      key={share.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-sm"
                    >
                      {share.shared_with_director_id ? (
                        <>
                          <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{share.director?.full_name || 'Dyrektor'}</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{share.team?.name || 'Zespół'}</span>
                        </>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-destructive hover:text-destructive/80 ml-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usuń udostępnienie</AlertDialogTitle>
                            <AlertDialogDescription>
                              Czy na pewno chcesz usunąć to udostępnienie? Osoba/zespół straci dostęp do kontaktów z tej grupy.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeShare.mutate(share.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Show groups without shares */}
          {groups?.filter(g => getSharesForGroup(g.id).length === 0).length === groups?.length && (
            <p className="text-center text-muted-foreground py-4">
              Brak skonfigurowanych udostępnień. Użyj formularza powyżej, aby dodać pierwsze.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

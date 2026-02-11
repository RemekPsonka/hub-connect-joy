import { useState, useMemo } from 'react';
import { Loader2, User, X, Search, UserPlus } from 'lucide-react';
import {
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  useUpdateMemberRole,
  useDirectorsByTenant,
} from '@/hooks/useDealsTeamMembers';
import { useDealTeamWithMembers, useUpdateDealTeam } from '@/hooks/useDealTeams';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCategoryManager } from './ProductCategoryManager';
import type { DealTeamRole } from '@/types/dealTeam';

interface TeamSettingsProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorPresets = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#6366F1',
];

const roleLabels: Record<DealTeamRole, string> = {
  leader: 'Leader',
  member: 'Członek',
  viewer: 'Obserwator',
};

export function TeamSettings({ teamId, open, onOpenChange }: TeamSettingsProps) {
  const { data: team, isLoading: teamLoading } = useDealTeamWithMembers(teamId);
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: allDirectors = [] } = useDirectorsByTenant();

  const updateTeam = useUpdateDealTeam();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();
  const updateRole = useUpdateMemberRole();

  // Team edit state
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#3B82F6');

  // Member to remove (for confirmation dialog)
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Add member state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('');

  // Initialize form when team loads
  const hasInitialized = useState(false)[0];
  if (team && !hasInitialized && teamName === '') {
    setTeamName(team.name || '');
    setTeamDescription(team.description || '');
    setTeamColor(team.color || '#3B82F6');
  }

  // Filter directors not already in team
  const availableDirectors = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.director_id));
    return allDirectors.filter(
      (d) =>
        !memberIds.has(d.id) &&
        d.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allDirectors, members, searchQuery]);

  // Save team changes
  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;

    await updateTeam.mutateAsync({
      id: teamId,
      name: teamName.trim(),
      description: teamDescription.trim() || null,
      color: teamColor,
    });
  };

  // Add new member
  const handleAddMember = async () => {
    if (!selectedDirectorId) return;

    await addMember.mutateAsync({
      teamId,
      directorId: selectedDirectorId,
      role: 'member',
    });

    setSelectedDirectorId('');
    setSearchQuery('');
  };

  // Remove member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    await removeMember.mutateAsync({
      memberId: memberToRemove.id,
      teamId,
    });

    setMemberToRemove(null);
  };

  // Change role
  const handleRoleChange = async (memberId: string, role: DealTeamRole) => {
    await updateRole.mutateAsync({
      memberId,
      role,
      teamId,
    });
  };

  const isLoading = teamLoading || membersLoading;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Ustawienia zespołu</SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Separator />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              <div className="space-y-6 pr-4">
                {/* Team basic info */}
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label>Nazwa zespołu</Label>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Nazwa zespołu"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Opis</Label>
                    <Textarea
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Opis zespołu..."
                      rows={2}
                    />
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label>Kolor</Label>
                    <div className="flex gap-2 flex-wrap">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setTeamColor(color)}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            teamColor === color
                              ? 'ring-2 ring-offset-2 ring-primary scale-110'
                              : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={handleSaveTeam}
                    disabled={!teamName.trim() || updateTeam.isPending}
                    className="w-full"
                  >
                    {updateTeam.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Zapisz zmiany
                  </Button>
                </div>

                <Separator />

                {/* Members section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Członkowie ({members.length})</h3>
                  </div>

                  {/* Member list */}
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {member.director?.full_name || 'Nieznany'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.director?.email || ''}
                          </p>
                        </div>
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            handleRoleChange(member.id, v as DealTeamRole)
                          }
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leader">Leader</SelectItem>
                            <SelectItem value="member">Członek</SelectItem>
                            <SelectItem value="viewer">Obserwator</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setMemberToRemove({
                              id: member.id,
                              name: member.director?.full_name || 'Nieznany',
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Add member section */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Dodaj członka</h3>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj directora..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Available directors */}
                  {searchQuery.length >= 2 && (
                    <div className="space-y-2">
                      {availableDirectors.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nie znaleziono użytkowników
                        </p>
                      ) : (
                        availableDirectors.slice(0, 5).map((director) => (
                          <div
                            key={director.id}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedDirectorId === director.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedDirectorId(director.id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{director.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {director.email}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Add button */}
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedDirectorId || addMember.isPending}
                    className="w-full gap-2"
                  >
                    {addMember.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Dodaj członka
                  </Button>
                </div>

                <Separator />

                {/* Product Categories */}
                <ProductCategoryManager teamId={teamId} />
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Remove member confirmation dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń członka zespołu</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć{' '}
              <span className="font-medium">{memberToRemove?.name}</span> z zespołu?
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

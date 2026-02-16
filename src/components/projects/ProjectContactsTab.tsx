import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectContacts, useAddProjectContact, useRemoveProjectContact, useUpdateProjectContact } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Users, Plus, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { SovraSuggestionsSection } from './SovraSuggestionsSection';

interface ProjectContactsTabProps {
  projectId: string;
}

function RoleEditor({ currentRole, onSave, isPending }: {
  currentRole: string | null;
  onSave: (role: string | null) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editValue, setEditValue] = useState(currentRole || '');

  const handleSave = () => {
    onSave(editValue.trim() || null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setEditValue(currentRole || ''); }}>
      <PopoverTrigger asChild>
        {currentRole ? (
          <Badge variant="outline" className="text-xs shrink-0 cursor-pointer hover:bg-accent gap-1">
            {currentRole}
            <Pencil className="h-2.5 w-2.5" />
          </Badge>
        ) : (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground shrink-0">
            + Rola
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-2">
          <Label className="text-xs">Rola w projekcie</Label>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="np. Zarząd, Kapituła"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <div className="flex gap-1.5 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={isPending}>
              Zapisz
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectContactsTab({ projectId }: ProjectContactsTabProps) {
  const navigate = useNavigate();
  const { data: projectContacts, isLoading } = useProjectContacts(projectId);
  const addContact = useAddProjectContact();
  const removeContact = useRemoveProjectContact();
  const updateContact = useUpdateProjectContact();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [roleInProject, setRoleInProject] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const excludeIds = projectContacts?.map((pc) => (pc as any).contact?.id).filter(Boolean) || [];

  // Role counts
  const { roleCounts, filteredContacts } = useMemo(() => {
    if (!projectContacts?.length) return { roleCounts: new Map<string, number>(), filteredContacts: [] };

    const counts = new Map<string, number>();
    for (const pc of projectContacts) {
      const role = pc.role_in_project || 'Bez roli';
      counts.set(role, (counts.get(role) || 0) + 1);
    }

    const filtered = roleFilter
      ? projectContacts.filter((pc) =>
          roleFilter === 'Bez roli' ? !pc.role_in_project : pc.role_in_project === roleFilter
        )
      : projectContacts;

    return { roleCounts: counts, filteredContacts: filtered };
  }, [projectContacts, roleFilter]);

  const handleAddContact = () => {
    if (!selectedContactId) return;
    addContact.mutate(
      { projectId, contactId: selectedContactId, roleInProject: roleInProject || undefined },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          setSelectedContactId(null);
          setRoleInProject('');
        },
      }
    );
  };

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  const addButton = (
    <Button size="sm" variant="outline" onClick={() => setIsAddDialogOpen(true)}>
      <Plus className="h-4 w-4 mr-1" />
      Dodaj kontakt
    </Button>
  );

  const addDialog = (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj kontakt do projektu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Kontakt</Label>
            <ConnectionContactSelect
              value={selectedContactId}
              onChange={setSelectedContactId}
              excludeIds={excludeIds}
              placeholder="Wyszukaj kontakt..."
            />
          </div>
          <div className="space-y-2">
            <Label>Rola w projekcie (opcjonalne)</Label>
            <Input
              value={roleInProject}
              onChange={(e) => setRoleInProject(e.target.value)}
              placeholder="np. Decydent, Sponsor, Konsultant"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleAddContact}
            disabled={!selectedContactId || addContact.isPending}
          >
            Dodaj kontakt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Filter bar
  const filterBar = projectContacts && projectContacts.length > 0 && roleCounts.size > 0 && (
    <div className="flex flex-wrap gap-1.5 mb-3">
      <Badge
        variant={roleFilter === null ? 'default' : 'outline'}
        className="cursor-pointer text-xs"
        onClick={() => setRoleFilter(null)}
      >
        Wszyscy ({projectContacts.length})
      </Badge>
      {Array.from(roleCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([role, count]) => (
          <Badge
            key={role}
            variant={roleFilter === role ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setRoleFilter(role)}
          >
            {role} ({count})
          </Badge>
        ))}
    </div>
  );

  if (!projectContacts?.length) {
    return (
      <>
        <DataCard>
          <EmptyState
            icon={Users}
            title="Brak kontaktów"
            description="Przypisz kontakty z CRM do tego projektu."
          />
          <div className="flex justify-center mt-4">
            {addButton}
          </div>
        </DataCard>
        <SovraSuggestionsSection projectId={projectId} />
        {addDialog}
      </>
    );
  }

  return (
    <>
      <DataCard
        title={`Kontakty projektu (${projectContacts.length})`}
        action={addButton}
      >
        {filterBar}
        <div className="divide-y divide-border">
          {filteredContacts.map((pc) => {
            const contact = (pc as any).contact;
            if (!contact) return null;

            const initials = contact.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?';

            return (
              <div key={pc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.full_name}</p>
                  {contact.position && (
                    <p className="text-xs text-muted-foreground truncate">{contact.position}</p>
                  )}
                </div>
                <RoleEditor
                  currentRole={pc.role_in_project}
                  isPending={updateContact.isPending}
                  onSave={(role) => updateContact.mutate({ id: pc.id, roleInProject: role, projectId })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeContact.mutate({ id: pc.id, projectId })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </DataCard>

      <SovraSuggestionsSection projectId={projectId} />
      {addDialog}
    </>
  );
}

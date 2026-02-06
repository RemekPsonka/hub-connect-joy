import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectContacts, useAddProjectContact, useRemoveProjectContact } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, Trash2, ExternalLink } from 'lucide-react';
import { SovraSuggestionsSection } from './SovraSuggestionsSection';

interface ProjectContactsTabProps {
  projectId: string;
}

export function ProjectContactsTab({ projectId }: ProjectContactsTabProps) {
  const navigate = useNavigate();
  const { data: projectContacts, isLoading } = useProjectContacts(projectId);
  const removeContact = useRemoveProjectContact();

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  if (!projectContacts?.length) {
    return (
      <>
        <DataCard>
          <EmptyState
            icon={Users}
            title="Brak kontaktów"
            description="Przypisz kontakty z CRM do tego projektu."
          />
        </DataCard>
        <SovraSuggestionsSection projectId={projectId} />
      </>
    );
  }

  return (
    <>
      <DataCard title={`Kontakty projektu (${projectContacts.length})`}>
        <div className="divide-y divide-border">
          {projectContacts.map((pc) => {
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
                {pc.role_in_project && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {pc.role_in_project}
                  </Badge>
                )}
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
    </>
  );
}

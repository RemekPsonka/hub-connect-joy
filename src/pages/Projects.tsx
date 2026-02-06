import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderKanban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useProjects, getStatusConfig, PROJECT_STATUSES } from '@/hooks/useProjects';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function Projects() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewOpen, setIsNewOpen] = useState(false);

  const { data: projects, isLoading } = useProjects({
    status: statusFilter,
    search: search || undefined,
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projekty</h1>
          <p className="text-sm text-muted-foreground">Zarządzaj projektami i zadaniami</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nowy projekt
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj projektów..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} height="h-44" />
          ))}
        </div>
      ) : !projects?.length ? (
        <DataCard>
          <EmptyState
            icon={FolderKanban}
            title="Brak projektów"
            description="Stwórz pierwszy projekt, aby zacząć organizować zadania i kontakty."
            action={{
              label: 'Nowy projekt',
              onClick: () => setIsNewOpen(true),
              icon: Plus,
            }}
          />
        </DataCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const statusCfg = getStatusConfig(project.status);
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-card rounded-xl shadow-sm border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
              >
                {/* Color bar */}
                <div
                  className="h-1"
                  style={{ backgroundColor: project.color || '#7C3AED' }}
                />

                <div className="p-5 space-y-3">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <Badge className={`shrink-0 text-xs ${statusCfg.color}`}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>
                      {project.owner?.full_name || 'Brak właściciela'}
                    </span>
                    <span>
                      {format(new Date(project.updated_at), 'd MMM yyyy', { locale: pl })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewProjectDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
    </div>
  );
}

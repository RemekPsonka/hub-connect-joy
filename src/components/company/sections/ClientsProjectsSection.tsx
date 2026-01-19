import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, Building } from 'lucide-react';
import type { SectionProps } from '../types';

export function ClientsProjectsSection({ data }: SectionProps) {
  const referenceProjects = data.reference_projects || [];
  const keyClients = data.key_clients || [];
  const targetIndustries = data.target_industries || [];

  const hasData = referenceProjects.length > 0 || keyClients.length > 0 || 
    data.target_clients || targetIndustries.length > 0;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Users className="h-4 w-4" />}
      title="Klienci i projekty referencyjne"
    >
      <div className="space-y-4">
        {/* Key clients */}
        {keyClients.length > 0 && (
          <SectionBox title="Kluczowi klienci" icon={<Building className="h-3 w-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {keyClients.map((client, i) => {
                if (typeof client === 'string') {
                  return (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {client}
                    </Badge>
                  );
                }
                return (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {client.name}
                    {client.industry && ` (${client.industry})`}
                  </Badge>
                );
              })}
            </div>
          </SectionBox>
        )}

        {/* Target clients description */}
        {data.target_clients && (
          <SectionBox title="Docelowi klienci">
            <p className="text-sm text-muted-foreground">{data.target_clients}</p>
          </SectionBox>
        )}

        {/* Target industries */}
        {targetIndustries.length > 0 && (
          <SectionBox title="Branże docelowe">
            <div className="flex flex-wrap gap-1.5">
              {targetIndustries.map((industry, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {industry}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Reference projects */}
        {referenceProjects.length > 0 && (
          <SectionBox title="Projekty referencyjne" icon={<Briefcase className="h-3 w-3" />}>
            <div className="space-y-2">
              {referenceProjects.slice(0, 6).map((project, i) => (
                <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      {project.client && (
                        <p className="text-xs text-primary">dla: {project.client}</p>
                      )}
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {project.year && (
                        <Badge variant="outline" className="text-[10px]">{project.year}</Badge>
                      )}
                      {project.value_pln && (
                        <Badge variant="secondary" className="text-[10px] text-green-600">
                          {(project.value_pln / 1_000_000).toFixed(1)}M PLN
                        </Badge>
                      )}
                    </div>
                  </div>
                  {project.industry && (
                    <Badge variant="outline" className="text-[10px] mt-1.5">{project.industry}</Badge>
                  )}
                </div>
              ))}
              {referenceProjects.length > 6 && (
                <p className="text-xs text-muted-foreground">
                  ...i {referenceProjects.length - 6} więcej projektów
                </p>
              )}
            </div>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}

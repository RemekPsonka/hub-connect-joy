import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Users, Building, Heart, ExternalLink } from 'lucide-react';
import type { SectionProps, ManagementPerson } from '../types';

export function ManagementSection({ data }: SectionProps) {
  const management = data.management || [];
  
  // Parse management from various formats
  const managementList: ManagementPerson[] = typeof management === 'string'
    ? [{ name: management, position: '' }]
    : management as ManagementPerson[];

  const hasData = managementList.length > 0 || data.company_size || 
    data.employee_count || data.company_culture || data.organizational_structure;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Users className="h-4 w-4" />}
      title="Zarząd i organizacja"
    >
      <div className="space-y-4">
        {/* Management list */}
        {managementList.length > 0 && typeof managementList[0] === 'object' && (
          <SectionBox title="Kadra zarządzająca">
            <div className="space-y-2">
              {managementList.map((person, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{person.name}</p>
                    {person.position && (
                      <p className="text-xs text-muted-foreground">{person.position}</p>
                    )}
                    {person.bio && (
                      <p className="text-xs text-muted-foreground mt-1">{person.bio}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {person.linkedin && (
                      <a 
                        href={person.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {person.source && !person.source.startsWith('http') && (
                      <Badge variant="outline" className="text-[10px]">{person.source}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Company info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.company_size && (
            <div className="p-2.5 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" />
                Wielkość
              </p>
              <p className="text-sm font-medium capitalize mt-0.5">{data.company_size}</p>
            </div>
          )}
          {data.employee_count && (
            <div className="p-2.5 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Pracownicy
              </p>
              <p className="text-sm font-medium mt-0.5">{data.employee_count}</p>
            </div>
          )}
          {(data.year_founded || data.founding_year) && (
            <div className="p-2.5 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Rok założenia</p>
              <p className="text-sm font-medium mt-0.5">{data.year_founded || data.founding_year}</p>
            </div>
          )}
          {data.legal_form && (
            <div className="p-2.5 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Forma prawna</p>
              <p className="text-sm font-medium mt-0.5">{data.legal_form}</p>
            </div>
          )}
        </div>

        {/* Company culture */}
        {data.company_culture && (
          <SectionBox title="Kultura organizacyjna" icon={<Heart className="h-3 w-3" />}>
            <p className="text-sm text-muted-foreground">{data.company_culture}</p>
          </SectionBox>
        )}

        {/* Organizational structure */}
        {data.organizational_structure && (
          <SectionBox title="Struktura organizacyjna">
            <p className="text-sm text-muted-foreground">{data.organizational_structure}</p>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}

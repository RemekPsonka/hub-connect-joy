import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserCircle, 
  Building2, 
  ExternalLink,
  CheckCircle2,
  Briefcase,
  Crown
} from 'lucide-react';
import type { CompanyAnalysis, ManagementPerson, Shareholder } from '../types';

interface PersonnelSectionProps {
  data: CompanyAnalysis;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

export function PersonnelSection({ data }: PersonnelSectionProps) {
  // Parse management from various formats
  const rawManagement = data.management || [];
  const managementList: ManagementPerson[] = typeof rawManagement === 'string'
    ? [{ name: rawManagement, position: '' }]
    : Array.isArray(rawManagement) 
      ? rawManagement as ManagementPerson[]
      : [];

  // Parse shareholders if available
  const shareholders: Shareholder[] = data.shareholders || [];

  const hasData = managementList.length > 0 || shareholders.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <SectionCard
      icon={<Users className="h-4 w-4" />}
      title="Osoby z firmy"
    >
      <div className="space-y-6">
        {/* Management Team */}
        {managementList.length > 0 && (
          <SectionBox title="Zarząd" icon={<Briefcase className="h-3 w-3" />}>
            <div className="space-y-2">
              {managementList.map((person, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {person.photo_url ? (
                      <AvatarImage src={person.photo_url} alt={person.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{person.name}</p>
                      {person.source === 'krs' && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          KRS
                        </Badge>
                      )}
                    </div>
                    {person.position && (
                      <p className="text-xs text-muted-foreground">{person.position}</p>
                    )}
                    {person.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{person.bio}</p>
                    )}
                  </div>
                  
                  {person.linkedin && (
                    <a 
                      href={person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                    >
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Shareholders */}
        {shareholders.length > 0 && (
          <SectionBox title="Wspólnicy / Udziałowcy" icon={<Crown className="h-3 w-3" />}>
            <div className="space-y-2">
              {shareholders.map((shareholder, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {shareholder.type === 'company' ? (
                        <Building2 className="h-4 w-4 text-primary" />
                      ) : (
                        <UserCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{shareholder.name}</p>
                        {shareholder.krs_verified && (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 shrink-0">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                            KRS
                          </Badge>
                        )}
                      </div>
                      {shareholder.role && (
                        <p className="text-xs text-muted-foreground">{shareholder.role}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 ml-3">
                    {shareholder.ownership_percent !== undefined && (
                      <p className="text-sm font-bold text-primary">
                        {shareholder.ownership_percent}%
                      </p>
                    )}
                    {shareholder.shares_count && (
                      <p className="text-xs text-muted-foreground">
                        {shareholder.shares_count.toLocaleString('pl-PL')} udziałów
                      </p>
                    )}
                    {shareholder.shares_value && (
                      <p className="text-xs text-muted-foreground">
                        {(shareholder.shares_value / 1000).toFixed(0)} tys. PLN
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Company info summary */}
        {(data.company_size || data.employee_count || data.legal_form) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            {data.company_size && (
              <div className="p-2.5 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Wielkość</p>
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
        )}

        {/* Company culture */}
        {data.company_culture && (
          <SectionBox title="Kultura organizacyjna">
            <p className="text-sm text-muted-foreground">{data.company_culture}</p>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Building, Globe, MapPin, Calendar,
  Target, Database, CheckCircle, AlertTriangle, FileText
} from 'lucide-react';
import { getCompanyLogoUrl } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Company } from './CompanyPipelineController';

interface CompanyKPIHeaderProps {
  company: Company;
  ownerContactId?: string;
}

const sizeLabels: Record<string, string> = {
  'micro': 'Mikro (1-9)',
  'small': 'Mała (10-49)',
  'medium': 'Średnia (50-249)',
  'large': 'Duża (250+)',
};

export function CompanyKPIHeader({ company }: CompanyKPIHeaderProps) {
  const confidenceScore = company.analysis_confidence_score || 0;
  const confidencePercent = Math.round(confidenceScore * 100);
  const missingSections = company.analysis_missing_sections || [];
  const dataSources = company.analysis_data_sources || {};
  const hasAnalysis = company.company_analysis_status === 'completed';

  // Count sources
  const sourceCount = Object.keys(dataSources).filter(k => 
    dataSources[k as keyof typeof dataSources]
  ).length;

  // Calculate completeness (16 total sections in CompanyAnalysis)
  const totalSections = 16;
  const completedSections = totalSections - missingSections.length;
  const completenessPercent = Math.round((completedSections / totalSections) * 100);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Logo */}
          <Avatar className="h-16 w-16 shrink-0">
            {(company.logo_url || getCompanyLogoUrl(company.website)) ? (
              <AvatarImage 
                src={company.logo_url || getCompanyLogoUrl(company.website) || ''} 
                alt={company.name}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              <Building className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          
          {/* Company Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h2 className="text-xl font-bold">{company.name}</h2>
              {company.short_name && company.short_name !== company.name && (
                <p className="text-sm text-muted-foreground">({company.short_name})</p>
              )}
              {company.tagline && (
                <p className="text-muted-foreground text-sm">{company.tagline}</p>
              )}
            </div>
            
            {/* Badges row 1: Industry, Size, Legal Form */}
            <div className="flex flex-wrap gap-2">
              {company.industry && (
                <Badge variant="secondary">{company.industry}</Badge>
              )}
              {company.company_size && (
                <Badge variant="outline">{sizeLabels[company.company_size] || company.company_size}</Badge>
              )}
              {company.legal_form && (
                <Badge variant="outline">{company.legal_form}</Badge>
              )}
            </div>

            {/* Registry IDs row: NIP, KRS, REGON */}
            {(company.nip || company.krs || company.regon) && (
              <div className="flex flex-wrap gap-2">
                {company.nip && (
                  <Badge variant="outline" className="font-mono text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    NIP: {company.nip}
                  </Badge>
                )}
                {company.krs && (
                  <Badge variant="outline" className="font-mono text-xs">
                    KRS: {company.krs}
                  </Badge>
                )}
                {company.regon && (
                  <Badge variant="outline" className="font-mono text-xs">
                    REGON: {company.regon}
                  </Badge>
                )}
              </div>
            )}

            {/* Quick Info Row */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {company.website && (
                <a 
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {(company.city || company.address) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {[company.address, company.postal_code, company.city].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          
          {/* KPI Badges (no Edit button - handled by ContactDetailHeader) */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {hasAnalysis && (
              <div className="flex flex-wrap gap-2 justify-end">
                {/* Confidence */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`gap-1 ${confidencePercent >= 70 ? 'border-green-500 text-green-600' : confidencePercent >= 40 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'}`}
                      >
                        <Target className="h-3 w-3" />
                        {confidencePercent}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pewność analizy: {confidencePercent}%</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Sources */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1">
                        <Database className="h-3 w-3" />
                        {sourceCount} źródeł
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Wykorzystane źródła danych</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Completeness */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`gap-1 ${completenessPercent >= 70 ? 'border-green-500 text-green-600' : 'border-amber-500 text-amber-600'}`}
                      >
                        {completenessPercent >= 70 ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {completedSections}/{totalSections}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Kompletność: {completenessPercent}%</p>
                      {missingSections.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Brakuje: {missingSections.slice(0, 3).join(', ')}
                          {missingSections.length > 3 && ` +${missingSections.length - 3}`}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {company.company_analysis_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Analiza: {format(new Date(company.company_analysis_date), 'd MMM yyyy', { locale: pl })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

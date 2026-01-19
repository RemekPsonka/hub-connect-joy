import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Globe } from 'lucide-react';
import type { SectionProps } from '../types';

export function LocationsCoverageSection({ data }: SectionProps) {
  const locations = data.locations || [];
  const coverage = data.geographic_coverage;
  const headquarters = data.headquarters;

  const hasData = locations.length > 0 || headquarters?.address || 
    coverage?.poland_cities?.length || coverage?.international_countries?.length;

  if (!hasData) return null;

  const locationTypeLabels: Record<string, string> = {
    headquarters: 'Centrala',
    branch: 'Oddział',
    factory: 'Fabryka',
    warehouse: 'Magazyn',
    showroom: 'Showroom',
    office: 'Biuro',
  };

  return (
    <SectionCard
      icon={<MapPin className="h-4 w-4" />}
      title="Lokalizacje i zasięg"
    >
      <div className="space-y-4">
        {/* Headquarters */}
        {headquarters && (headquarters.address || headquarters.city) && (
          <SectionBox title="Siedziba główna" icon={<Building className="h-3 w-3" />}>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm font-medium">
                {[headquarters.address, headquarters.postal_code, headquarters.city]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {headquarters.country && headquarters.country !== 'Polska' && (
                <p className="text-xs text-muted-foreground mt-1">{headquarters.country}</p>
              )}
            </div>
          </SectionBox>
        )}

        {/* Locations list */}
        {locations.length > 0 && (
          <SectionBox title={`Lokalizacje (${locations.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {locations.slice(0, 8).map((loc, i) => (
                <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {locationTypeLabels[loc.type] || loc.type}
                    </Badge>
                    <p className="text-sm font-medium">{loc.city}</p>
                  </div>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                  )}
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    {loc.employee_count && <span>{loc.employee_count} osób</span>}
                    {loc.size_sqm && <span>• {loc.size_sqm} m²</span>}
                    {loc.opening_year && <span>• od {loc.opening_year}</span>}
                  </div>
                </div>
              ))}
            </div>
            {locations.length > 8 && (
              <p className="text-xs text-muted-foreground mt-2">
                ...i {locations.length - 8} więcej lokalizacji
              </p>
            )}
          </SectionBox>
        )}

        {/* Geographic coverage */}
        {coverage && (
          <div className="space-y-3">
            {/* Poland cities */}
            {coverage.poland_cities && coverage.poland_cities.length > 0 && (
              <SectionBox title="Miasta w Polsce">
                <div className="flex flex-wrap gap-1.5">
                  {coverage.poland_cities.map((city, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {city}
                    </Badge>
                  ))}
                </div>
              </SectionBox>
            )}

            {/* Poland regions */}
            {coverage.poland_regions && coverage.poland_regions.length > 0 && (
              <SectionBox title="Regiony w Polsce">
                <div className="flex flex-wrap gap-1.5">
                  {coverage.poland_regions.map((region, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {region}
                    </Badge>
                  ))}
                </div>
              </SectionBox>
            )}

            {/* International */}
            {coverage.international_countries && coverage.international_countries.length > 0 && (
              <SectionBox title="Obecność międzynarodowa" icon={<Globe className="h-3 w-3" />}>
                <div className="flex flex-wrap gap-1.5">
                  {coverage.international_countries.map((country, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      🌍 {country}
                    </Badge>
                  ))}
                </div>
              </SectionBox>
            )}

            {/* Export markets */}
            {coverage.export_markets && coverage.export_markets.length > 0 && (
              <SectionBox title="Rynki eksportowe">
                <div className="flex flex-wrap gap-1.5">
                  {coverage.export_markets.map((market, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      📦 {market}
                    </Badge>
                  ))}
                </div>
              </SectionBox>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

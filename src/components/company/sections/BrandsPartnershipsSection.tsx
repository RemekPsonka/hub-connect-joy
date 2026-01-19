import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Award, Handshake, Tag } from 'lucide-react';
import type { SectionProps } from '../types';

export function BrandsPartnershipsSection({ data }: SectionProps) {
  const ownBrands = data.own_brands || [];
  const representedBrands = data.represented_brands || [];
  const partnerships = typeof data.partnerships === 'string' 
    ? [data.partnerships] 
    : data.partnerships || [];
  const dealerships = data.dealerships || [];

  const hasData = ownBrands.length > 0 || representedBrands.length > 0 || 
    partnerships.length > 0 || dealerships.length > 0;

  if (!hasData) return null;

  const renderBrand = (brand: any, i: number) => {
    if (typeof brand === 'string') {
      return (
        <Badge key={i} variant="secondary" className="text-xs">
          {brand}
        </Badge>
      );
    }
    return (
      <div key={i} className="p-2 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium">{brand.name}</p>
        {brand.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{brand.description}</p>
        )}
        {brand.category && (
          <Badge variant="outline" className="text-[10px] mt-1">{brand.category}</Badge>
        )}
      </div>
    );
  };

  return (
    <SectionCard
      icon={<Award className="h-4 w-4" />}
      title="Marki i partnerstwa"
    >
      <div className="space-y-4">
        {/* Own brands */}
        {ownBrands.length > 0 && (
          <SectionBox title="Własne marki" icon={<Tag className="h-3 w-3" />}>
            {ownBrands.every(b => typeof b === 'string') ? (
              <div className="flex flex-wrap gap-1.5">
                {ownBrands.map((brand, i) => renderBrand(brand, i))}
              </div>
            ) : (
              <div className="space-y-2">
                {ownBrands.map((brand, i) => renderBrand(brand, i))}
              </div>
            )}
          </SectionBox>
        )}

        {/* Represented brands */}
        {representedBrands.length > 0 && (
          <SectionBox title="Reprezentowane marki">
            {representedBrands.every(b => typeof b === 'string') ? (
              <div className="flex flex-wrap gap-1.5">
                {representedBrands.map((brand, i) => renderBrand(brand, i))}
              </div>
            ) : (
              <div className="space-y-2">
                {representedBrands.map((brand, i) => renderBrand(brand, i))}
              </div>
            )}
          </SectionBox>
        )}

        {/* Dealerships */}
        {dealerships.length > 0 && (
          <SectionBox title="Dealerstwa">
            <div className="flex flex-wrap gap-1.5">
              {dealerships.map((dealer, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {dealer}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Partnerships */}
        {partnerships.length > 0 && (
          <SectionBox title="Partnerstwa" icon={<Handshake className="h-3 w-3" />}>
            <ul className="space-y-1">
              {partnerships.map((partner, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {partner}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}

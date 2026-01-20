import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Gift, Award, CheckCircle } from 'lucide-react';
import type { SectionProps } from '../types';
import { safeArray, safeAwardArray } from '../utils';

export function OfferSection({ data }: SectionProps) {
  // Use safe parsers for arrays that may be strings or objects
  const uniqueSellingPoints = safeArray(data.unique_selling_points);
  const certifications = safeArray(data.certifications);
  const awards = safeAwardArray(data.awards);

  const hasData = data.offer_summary || uniqueSellingPoints.length > 0 || 
    certifications.length > 0 || awards.length > 0 || data.what_company_offers;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Gift className="h-4 w-4" />}
      title="Co firma oferuje"
    >
      <div className="space-y-4">
        {/* Offer summary */}
        {data.offer_summary && (
          <SectionBox title="Podsumowanie oferty">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.offer_summary}
            </p>
          </SectionBox>
        )}

        {/* Legacy fallback */}
        {data.what_company_offers && !data.offer_summary && (
          <SectionBox title="Co firma oferuje">
            <p className="text-sm text-muted-foreground">{data.what_company_offers}</p>
          </SectionBox>
        )}

        {/* Unique selling points */}
        {uniqueSellingPoints.length > 0 && (
          <SectionBox title="Unikalne przewagi (USP)" icon={<CheckCircle className="h-3 w-3" />}>
            <ul className="space-y-1.5">
              {uniqueSellingPoints.map((usp, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  {usp}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <SectionBox title="Certyfikaty" icon={<Award className="h-3 w-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {certifications.map((cert, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  🏆 {cert}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Awards */}
        {awards.length > 0 && (
          <SectionBox title="Nagrody i wyróżnienia">
            <div className="flex flex-wrap gap-1.5">
              {awards.map((award, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  🏅 {award}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}

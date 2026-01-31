import { Card, CardContent } from '@/components/ui/card';
import { MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { type LocationExposure, formatValuePLN } from './types';

interface ExposureSummaryFooterProps {
  locationCount: number;
  totalTIV: number;
  topRiskLocation: LocationExposure | null;
}

export function ExposureSummaryFooter({
  locationCount,
  totalTIV,
  topRiskLocation,
}: ExposureSummaryFooterProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Lokalizacje:</span>
            <span className="font-semibold">{locationCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Łączny TIV:</span>
            <span className="font-semibold text-primary">
              {formatValuePLN(totalTIV)}
            </span>
          </div>
          
          {topRiskLocation && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Top ryzyko:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {topRiskLocation.name} ({formatValuePLN(topRiskLocation.total_value)})
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

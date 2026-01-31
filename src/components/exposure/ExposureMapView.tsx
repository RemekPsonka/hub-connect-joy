import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Map } from 'lucide-react';
import { type LocationExposure, getPinColor, formatValuePLN } from './types';

interface ExposureMapViewProps {
  locations: LocationExposure[];
  onAddLocation: () => void;
  onLocationClick?: (locationId: string) => void;
}

export function ExposureMapView({ 
  locations, 
  onAddLocation,
  onLocationClick 
}: ExposureMapViewProps) {
  return (
    <Card className="h-full min-h-[300px]">
      <CardContent className="p-4 h-full flex flex-col">
        {/* Map Placeholder */}
        <div className="flex-1 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-4 relative">
          <Map className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Mapa Lokalizacji</p>
          <p className="text-xs text-muted-foreground/60">(Placeholder dla Leaflet/Google Maps)</p>
          
          {/* Location pins overlay */}
          {locations.length > 0 && (
            <div className="absolute top-4 left-4 space-y-1">
              {locations.slice(0, 5).map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => onLocationClick?.(loc.id)}
                  className="flex items-center gap-2 bg-background/90 px-2 py-1 rounded text-xs hover:bg-background transition-colors"
                >
                  <MapPin className={`h-3 w-3 ${getPinColor(loc.total_value)}`} />
                  <span className="truncate max-w-[100px]">{loc.name}</span>
                </button>
              ))}
              {locations.length > 5 && (
                <span className="text-xs text-muted-foreground pl-2">
                  +{locations.length - 5} więcej
                </span>
              )}
            </div>
          )}

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onAddLocation}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Dodaj lokalizację
          </Button>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">&lt; 10M PLN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">10-50M PLN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">&gt; 50M PLN</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

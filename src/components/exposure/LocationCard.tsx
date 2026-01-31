import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MapPin, Trash2 } from 'lucide-react';
import { ValueSlider } from './ValueSlider';
import { 
  type LocationExposure, 
  type ActivityType, 
  type ConstructionType,
  ACTIVITY_TYPE_LABELS, 
  ACTIVITY_TYPE_COLORS,
  CONSTRUCTION_TYPE_LABELS,
  formatValuePLN,
  getPinColor,
} from './types';

interface LocationCardProps {
  location: LocationExposure;
  onUpdate: (updates: Partial<LocationExposure>) => void;
  onDelete: () => void;
}

export function LocationCard({ location, onUpdate, onDelete }: LocationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleActivityChange = (activity: ActivityType) => {
    onUpdate({ activity_type: activity });
  };

  const handleConstructionChange = (construction: ConstructionType) => {
    onUpdate({ construction_type: construction });
  };

  const handleValueChange = (field: 'building_value' | 'machinery_value' | 'stock_value', value: number) => {
    onUpdate({ [field]: value });
  };

  const handleFluctuationChange = (checked: boolean) => {
    onUpdate({ stock_fluctuation: checked });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete();
  };

  const pinColorClass = getPinColor(location.total_value);
  const activityTypes: ActivityType[] = ['production', 'warehouse', 'office', 'retail'];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <MapPin className={`h-5 w-5 mt-0.5 ${pinColorClass}`} />
            <div>
              <h3 className="font-semibold text-base">{location.name}</h3>
              {(location.address || location.city) && (
                <p className="text-sm text-muted-foreground">
                  {[location.address, location.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Activity Type Badges */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Typ działalności</Label>
          <div className="flex flex-wrap gap-2">
            {activityTypes.map((activity) => (
              <Badge
                key={activity}
                variant={location.activity_type === activity ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${
                  location.activity_type === activity 
                    ? ACTIVITY_TYPE_COLORS[activity] + ' text-white border-transparent' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleActivityChange(activity)}
              >
                {ACTIVITY_TYPE_LABELS[activity]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Construction Type Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Konstrukcja</Label>
          <RadioGroup
            value={location.construction_type}
            onValueChange={(value) => handleConstructionChange(value as ConstructionType)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non_combustible" id={`non-${location.id}`} />
              <Label htmlFor={`non-${location.id}`} className="text-sm cursor-pointer">
                {CONSTRUCTION_TYPE_LABELS.non_combustible}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="combustible" id={`comb-${location.id}`} />
              <Label htmlFor={`comb-${location.id}`} className="text-sm cursor-pointer">
                {CONSTRUCTION_TYPE_LABELS.combustible}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Value Sliders */}
        <div className="space-y-4 pt-2 border-t">
          <ValueSlider
            label="Budynek"
            value={Number(location.building_value) || 0}
            max={100_000_000}
            onChange={(value) => handleValueChange('building_value', value)}
          />
          
          <ValueSlider
            label="Maszyny/Sprzęt"
            value={Number(location.machinery_value) || 0}
            max={50_000_000}
            onChange={(value) => handleValueChange('machinery_value', value)}
          />
          
          <ValueSlider
            label="Zapasy/Towary"
            value={Number(location.stock_value) || 0}
            max={50_000_000}
            onChange={(value) => handleValueChange('stock_value', value)}
            showFluctuation
            hasFluctuation={location.stock_fluctuation}
            onFluctuationChange={handleFluctuationChange}
          />
        </div>

        {/* Total Exposure */}
        <div className={`p-3 rounded-lg border-2 ${
          location.risk_tier === 'high' 
            ? 'border-red-500/30 bg-red-50 dark:bg-red-950/20' 
            : location.risk_tier === 'medium'
            ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/20'
            : 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              SUMA EKSPOZYCJI:
            </span>
            <span className={`text-lg font-bold ${
              location.risk_tier === 'high' 
                ? 'text-red-600 dark:text-red-400' 
                : location.risk_tier === 'medium'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {formatValuePLN(location.total_value)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plane, ShoppingBag, Users, Building2, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialExposures } from './types';

interface SpecialExposureCardsProps {
  exposures: SpecialExposures;
  onChange: (exposures: SpecialExposures) => void;
}

export function SpecialExposureCards({ exposures, onChange }: SpecialExposureCardsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" />
          Specjalne punkty ekspozycji
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Aviation / Auto / Rail / Offshore */}
          <div className={cn(
            "p-4 rounded-lg border-2 transition-all",
            exposures.aviation_auto_rail_offshore 
              ? "border-red-500 bg-red-50 dark:bg-red-950/30"
              : "border-border"
          )}>
            <div className="flex items-start gap-3 mb-3">
              <Plane className={cn(
                "h-5 w-5 mt-0.5",
                exposures.aviation_auto_rail_offshore && "text-red-500"
              )} />
              <div>
                <Label className="font-medium">
                  Lotnictwo / Automotive / Kolej / Offshore?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Branże wysokiego ryzyka
                </p>
              </div>
            </div>
            <ToggleGroup
              type="single"
              value={exposures.aviation_auto_rail_offshore ? 'yes' : 'no'}
              onValueChange={(v) => {
                if (v) onChange({ ...exposures, aviation_auto_rail_offshore: v === 'yes' });
              }}
              className="justify-start"
            >
              <ToggleGroupItem 
                value="yes" 
                className={cn(
                  "data-[state=on]:bg-red-500 data-[state=on]:text-white"
                )}
              >
                TAK
              </ToggleGroupItem>
              <ToggleGroupItem value="no">
                NIE
              </ToggleGroupItem>
            </ToggleGroup>
            {exposures.aviation_auto_rail_offshore && (
              <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                <AlertTriangle className="h-4 w-4" />
                Wysokie ryzyko - wymagana specjalistyczna polisa
              </div>
            )}
          </div>

          {/* e-Commerce */}
          <div className={cn(
            "p-4 rounded-lg border-2 transition-all",
            exposures.ecommerce 
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
              : "border-border"
          )}>
            <div className="flex items-start gap-3 mb-3">
              <ShoppingBag className={cn(
                "h-5 w-5 mt-0.5",
                exposures.ecommerce && "text-amber-500"
              )} />
              <div>
                <Label className="font-medium">
                  Sprzedaż online (e-Commerce)?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Sklep internetowy, marketplace
                </p>
              </div>
            </div>
            <ToggleGroup
              type="single"
              value={exposures.ecommerce ? 'yes' : 'no'}
              onValueChange={(v) => {
                if (v) onChange({ ...exposures, ecommerce: v === 'yes' });
              }}
              className="justify-start"
            >
              <ToggleGroupItem 
                value="yes"
                className="data-[state=on]:bg-amber-500 data-[state=on]:text-white"
              >
                TAK
              </ToggleGroupItem>
              <ToggleGroupItem value="no">
                NIE
              </ToggleGroupItem>
            </ToggleGroup>
            {exposures.ecommerce && (
              <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                <AlertTriangle className="h-4 w-4" />
                Ryzyko Cyber i RODO - rozważ ubezpieczenie Cyber
              </div>
            )}
          </div>
        </div>

        {/* B2B vs B2C Slider */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">B2C</span>
              <span className="text-xs text-muted-foreground">(Klienci indywidualni)</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="text-xs text-muted-foreground">(Klienci biznesowi)</span>
              <span className="text-sm font-medium">B2B</span>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          
          <Slider
            value={[exposures.b2b_vs_b2c_pct]}
            onValueChange={([v]) => onChange({ ...exposures, b2b_vs_b2c_pct: v })}
            max={100}
            step={5}
            className="my-4"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="font-medium text-foreground">
              {exposures.b2b_vs_b2c_pct}% B2B / {100 - exposures.b2b_vs_b2c_pct}% B2C
            </span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Globe } from 'lucide-react';
import { TerritorialSlider } from './TerritorialSlider';
import { TERRITORY_COLORS, type Currency, type TerritorialSplit as TerritorialSplitType } from './types';

interface TerritorialSplitProps {
  split: TerritorialSplitType;
  totalRevenue: number;
  currency: Currency;
  onChange: (split: TerritorialSplitType) => void;
}

export function TerritorialSplit({ split, totalRevenue, currency, onChange }: TerritorialSplitProps) {
  const chartData = [
    { name: 'Polska', value: split.poland_pct, color: TERRITORY_COLORS.poland },
    { name: 'UE / OECD', value: split.eu_oecd_pct, color: TERRITORY_COLORS.eu_oecd },
    { name: 'USA / Kanada', value: split.usa_canada_pct, color: TERRITORY_COLORS.usa_canada },
    { name: 'Reszta świata', value: split.rest_world_pct, color: TERRITORY_COLORS.rest_world },
  ].filter(d => d.value > 0);

  const total = split.poland_pct + split.eu_oecd_pct + split.usa_canada_pct + split.rest_world_pct;
  const isValid = Math.abs(total - 100) < 0.01;

  const handleChange = (field: keyof TerritorialSplitType, value: number) => {
    onChange({ ...split, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5 text-primary" />
          Podział terytorialny przychodów
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Udział']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <TerritorialSlider
              label="Polska / Kraj"
              value={split.poland_pct}
              onChange={(v) => handleChange('poland_pct', v)}
              totalRevenue={totalRevenue}
              currency={currency}
              color={TERRITORY_COLORS.poland}
            />
            
            <TerritorialSlider
              label="UE / OECD"
              value={split.eu_oecd_pct}
              onChange={(v) => handleChange('eu_oecd_pct', v)}
              totalRevenue={totalRevenue}
              currency={currency}
              color={TERRITORY_COLORS.eu_oecd}
            />
            
            <TerritorialSlider
              label="USA / Kanada"
              value={split.usa_canada_pct}
              onChange={(v) => handleChange('usa_canada_pct', v)}
              totalRevenue={totalRevenue}
              currency={currency}
              color={TERRITORY_COLORS.usa_canada}
              isDanger
            />
            
            <TerritorialSlider
              label="Reszta świata"
              value={split.rest_world_pct}
              onChange={(v) => handleChange('rest_world_pct', v)}
              totalRevenue={totalRevenue}
              currency={currency}
              color={TERRITORY_COLORS.rest_world}
            />

            {!isValid && (
              <div className="text-sm text-amber-600 dark:text-amber-400 font-medium text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                ⚠️ Suma: {total.toFixed(0)}% (powinna wynosić 100%)
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

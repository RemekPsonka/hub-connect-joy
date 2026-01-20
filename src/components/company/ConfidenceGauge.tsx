import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface ConfidenceGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceGauge({ score, size = 'md', showLabel = true }: ConfidenceGaugeProps) {
  const percentage = Math.round(score * 100);
  
  // Color based on score - using warm colors (avoiding blue per user preference)
  const getColor = () => {
    if (percentage >= 70) return 'hsl(142, 71%, 45%)'; // Green
    if (percentage >= 50) return 'hsl(45, 93%, 47%)';  // Amber/Yellow
    if (percentage >= 30) return 'hsl(25, 95%, 53%)';  // Orange
    return 'hsl(0, 72%, 51%)';                          // Red
  };

  const getLabel = () => {
    if (percentage >= 70) return 'Wysoka';
    if (percentage >= 50) return 'Średnia';
    if (percentage >= 30) return 'Niska';
    return 'Bardzo niska';
  };

  const data = [{ value: percentage, fill: getColor() }];

  const dimensions = {
    sm: { width: 80, height: 80, innerRadius: 25, outerRadius: 35, fontSize: 'text-lg' },
    md: { width: 100, height: 100, innerRadius: 32, outerRadius: 44, fontSize: 'text-xl' },
    lg: { width: 120, height: 120, innerRadius: 40, outerRadius: 54, fontSize: 'text-2xl' },
  };

  const dim = dimensions[size];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dim.width, height: dim.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={dim.innerRadius}
            outerRadius={dim.outerRadius}
            barSize={10}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'hsl(var(--muted))' }}
              dataKey="value"
              cornerRadius={5}
              animationDuration={1000}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', dim.fontSize)} style={{ color: getColor() }}>
            {percentage}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground mt-1">{getLabel()}</span>
      )}
    </div>
  );
}

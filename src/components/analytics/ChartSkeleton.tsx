import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end gap-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1" 
              style={{ height: `${Math.random() * 60 + 40}%` }} 
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  );
}

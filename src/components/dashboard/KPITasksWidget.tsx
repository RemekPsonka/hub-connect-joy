import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, ArrowRight, CheckCircle } from 'lucide-react';
import { useKPICategories } from '@/hooks/useTaskCategories';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';

export function KPITasksWidget() {
  const navigate = useNavigate();
  const { data: kpiCategories = [], isLoading: loadingCategories } = useKPICategories();
  
  if (loadingCategories) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (kpiCategories.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Cele KPI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {kpiCategories.slice(0, 3).map((category) => (
          <div
            key={category.id}
            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/tasks?categoryId=${category.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium">{category.name}</span>
              </div>
              <Badge variant={category.progress >= 100 ? 'default' : 'secondary'}>
                {category.completed_count}/{category.kpi_target}
              </Badge>
            </div>
            <div className="space-y-1">
              <Progress value={Math.min(category.progress, 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{category.progress}% ukończone</span>
                {category.progress >= 100 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Cel osiągnięty!
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {kpiCategories.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate('/tasks')}
          >
            Zobacz wszystkie cele
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

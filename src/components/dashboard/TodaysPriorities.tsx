import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ListTodo, Calendar, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Priority {
  id: string;
  type: 'task' | 'consultation';
  title: string;
  subtitle: string;
  time?: string;
  priority?: string;
}

export function TodaysPriorities() {
  const navigate = useNavigate();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPriorities() {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Fetch today's consultations
        const { data: consultations } = await supabase
          .from('consultations')
          .select('id, scheduled_at, contacts(full_name)')
          .gte('scheduled_at', `${todayStr}T00:00:00`)
          .lt('scheduled_at', `${todayStr}T23:59:59`)
          .order('scheduled_at', { ascending: true })
          .limit(5);
        
        // Fetch high priority pending tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, due_date, priority')
          .eq('status', 'pending')
          .order('priority', { ascending: false })
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(5);
        
        const items: Priority[] = [];
        
        // Add consultations
        consultations?.forEach((c: any) => {
          items.push({
            id: c.id,
            type: 'consultation',
            title: `Spotkanie z ${c.contacts?.full_name || 'nieznanym'}`,
            subtitle: 'Konsultacja',
            time: format(new Date(c.scheduled_at), 'HH:mm', { locale: pl }),
          });
        });
        
        // Add tasks
        tasks?.forEach((t) => {
          items.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: t.due_date 
              ? `Termin: ${format(new Date(t.due_date), 'd MMM', { locale: pl })}`
              : 'Brak terminu',
            priority: t.priority || undefined,
          });
        });
        
        // Sort by time for consultations, then priority for tasks
        items.sort((a, b) => {
          if (a.type === 'consultation' && b.type === 'task') return -1;
          if (a.type === 'task' && b.type === 'consultation') return 1;
          if (a.time && b.time) return a.time.localeCompare(b.time);
          return 0;
        });
        
        setPriorities(items.slice(0, 6));
      } catch (error) {
        console.error('Error fetching priorities:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPriorities();
  }, []);
  
  const handleClick = (priority: Priority) => {
    if (priority.type === 'consultation') {
      navigate(`/consultations/${priority.id}`);
    } else {
      navigate('/tasks');
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-5 w-5 text-primary" />
            Priorytety na dziś
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-5 w-5 text-primary" />
          Priorytety na dziś
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {priorities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium">Czyste biurko!</p>
            <p className="text-xs text-muted-foreground">
              Brak pilnych zadań na dziś
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {priorities.map((priority) => (
              <button
                key={`${priority.type}-${priority.id}`}
                onClick={() => handleClick(priority)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  priority.type === 'consultation' ? 'bg-blue-500/10' : 'bg-orange-500/10'
                )}>
                  {priority.type === 'consultation' ? (
                    <Calendar className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{priority.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{priority.subtitle}</span>
                    {priority.time && (
                      <span className="font-medium text-blue-500">{priority.time}</span>
                    )}
                    {priority.priority === 'high' && (
                      <span className="text-destructive font-medium">Pilne</span>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

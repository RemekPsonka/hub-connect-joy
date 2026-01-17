import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, User, ChevronRight } from 'lucide-react';
import { useRelationshipHealth, RelationshipAlert } from '@/hooks/useRelationshipHealth';
import { cn } from '@/lib/utils';

function AlertItem({ alert }: { alert: RelationshipAlert }) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(`/contacts/${alert.contactId}`)}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
    >
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
        alert.status === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
      )}>
        {alert.status === 'critical' ? (
          <AlertTriangle className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{alert.contactName}</p>
        <p className="text-sm text-muted-foreground truncate">
          {alert.company || 'Brak firmy'} • {alert.daysSinceContact} dni bez kontaktu
        </p>
      </div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

export function RelationshipAlerts() {
  const { alerts, isLoading, error } = useRelationshipHealth();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alerty relacji
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alerty relacji
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alerty relacji
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium">Wszystkie relacje zdrowe!</p>
            <p className="text-xs text-muted-foreground">
              Nie ma kontaktów wymagających uwagi
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const criticalCount = alerts.filter(a => a.status === 'critical').length;
  const warningCount = alerts.filter(a => a.status === 'warning').length;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alerty relacji
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                {criticalCount} krytycznych
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                {warningCount} ostrzeżeń
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {alerts.slice(0, 5).map((alert) => (
            <AlertItem key={alert.contactId} alert={alert} />
          ))}
        </div>
        
        {alerts.length > 5 && (
          <Button variant="ghost" className="w-full mt-2" size="sm">
            Zobacz wszystkie ({alerts.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

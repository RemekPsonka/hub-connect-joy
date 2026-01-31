import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { type RiskAlert } from './types';

interface RiskAlertsProps {
  alerts: RiskAlert[];
}

export function RiskAlerts({ alerts }: RiskAlertsProps) {
  if (alerts.length === 0) return null;

  const getAlertIcon = (type: RiskAlert['type']) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (type: RiskAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAlertStyles = (type: RiskAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-red-500/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400';
      case 'warning':
        return 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400';
      default:
        return 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        Alerty ryzyka
      </h4>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <Alert 
            key={alert.id} 
            className={`py-2 ${getAlertStyles(alert.type)}`}
          >
            <div className="flex items-start gap-2">
              {getAlertIcon(alert.type)}
              <AlertDescription className="text-sm">
                {alert.message}
              </AlertDescription>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
}

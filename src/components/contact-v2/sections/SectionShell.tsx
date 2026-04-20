import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface SectionShellProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function SectionShell({
  isLoading,
  isError,
  error,
  refetch,
  isEmpty,
  emptyMessage = 'Brak danych',
  children,
}: SectionShellProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{error instanceof Error ? error.message : 'Błąd ładowania'}</span>
          {refetch && (
            <Button size="sm" variant="outline" onClick={refetch}>
              Spróbuj ponownie
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return <>{children}</>;
}

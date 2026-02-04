import { Loader2 } from 'lucide-react';

export const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Ładowanie...</p>
  </div>
);

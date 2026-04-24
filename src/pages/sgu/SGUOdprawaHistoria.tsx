import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SGUOdprawaHistoria() {
  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Historia odpraw</h1>
        <p className="text-sm text-muted-foreground">
          Lista poprzednich sesji wraz z migawkami agendy.
        </p>
      </div>
      <Alert>
        <AlertDescription>
          Wkrótce — historia, filtry i podgląd migawki dostępne w sprincie ODPRAWA-01 (commit 2b).
        </AlertDescription>
      </Alert>
    </div>
  );
}

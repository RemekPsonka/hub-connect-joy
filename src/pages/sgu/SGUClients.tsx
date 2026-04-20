import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users } from 'lucide-react';

export default function SGUClients() {
  return (
    <div className="p-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle>Klienci — wkrótce</AlertTitle>
        <AlertDescription>
          Moduł Klienci (portfel, obszary sprzedaży, polecenia, odnowienia, prowizje)
          zostanie udostępniony w iteracji <strong>SGU-REFACTOR-IA-2</strong>.
        </AlertDescription>
      </Alert>
    </div>
  );
}

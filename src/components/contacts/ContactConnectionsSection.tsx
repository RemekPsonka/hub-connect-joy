import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContactConnections, useUpdateConnection, useDeleteConnection } from '@/hooks/useConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Users, Plus, Building2, UserPlus, ChevronDown, Trash2 } from 'lucide-react';
import { AddConnectionModal } from '@/components/network/AddConnectionModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ContactConnectionsSectionProps {
  contactId: string;
  contactName: string;
}

const connectionTypeLabels: Record<string, string> = {
  knows: 'Znajomy',
  met_at_event: 'Poznany na evencie',
  family: 'Rodzina',
  colleague: 'Współpracownik',
  business_partner: 'Partner biznesowy',
  krs_associate: 'KRS - Współpracownik',
};

const connectionTypeColors: Record<string, string> = {
  knows: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  met_at_event: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  family: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  colleague: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  business_partner: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  krs_associate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

interface ConnectionItemProps {
  connection: {
    id: string;
    connection_type: string | null;
    strength: number | null;
    connected_contact?: {
      id: string;
      full_name: string;
      company: string | null;
      position: string | null;
    };
  };
}

function ConnectionItem({ connection }: ConnectionItemProps) {
  const [localStrength, setLocalStrength] = useState(connection.strength || 5);
  const [isStrengthOpen, setIsStrengthOpen] = useState(false);
  const updateConnection = useUpdateConnection();
  const deleteConnection = useDeleteConnection();

  const handleTypeChange = (newType: string) => {
    updateConnection.mutate(
      { connectionId: connection.id, connectionType: newType },
      {
        onSuccess: () => {
          toast.success('Typ połączenia zaktualizowany');
        },
        onError: () => {
          toast.error('Błąd podczas aktualizacji');
        },
      }
    );
  };

  const handleStrengthChange = (value: number) => {
    updateConnection.mutate(
      { connectionId: connection.id, strength: value },
      {
        onSuccess: () => {
          toast.success('Siła relacji zaktualizowana');
          setIsStrengthOpen(false);
        },
        onError: () => {
          toast.error('Błąd podczas aktualizacji');
        },
      }
    );
  };

  const handleDelete = () => {
    deleteConnection.mutate(connection.id, {
      onSuccess: () => {
        toast.success('Połączenie usunięte');
      },
      onError: () => {
        toast.error('Błąd podczas usuwania');
      },
    });
  };

  const connectionType = connection.connection_type || 'knows';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <Link 
        to={`/contacts/${connection.connected_contact?.id}`}
        className="flex-1 min-w-0"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {connection.connected_contact?.full_name}
          </span>
        </div>
        {connection.connected_contact?.company && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{connection.connected_contact.company}</span>
            {connection.connected_contact.position && (
              <span className="truncate">• {connection.connected_contact.position}</span>
            )}
          </div>
        )}
      </Link>

      <div className="flex items-center gap-2 ml-3">
        {/* Editable Connection Type */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 ${connectionTypeColors[connectionType] || 'bg-secondary text-secondary-foreground'}`}
            >
              {connectionTypeLabels[connectionType] || connectionType}
              <ChevronDown className="h-3 w-3 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(connectionTypeLabels).map(([key, label]) => (
              <DropdownMenuItem 
                key={key}
                onClick={() => handleTypeChange(key)}
                className={key === connectionType ? 'bg-muted' : ''}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Editable Strength */}
        <Popover open={isStrengthOpen} onOpenChange={setIsStrengthOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 cursor-pointer hover:opacity-80" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(connection.strength || 5) * 10}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-4">
                {connection.strength || 5}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-3">
              <Label className="text-sm">Siła relacji: {localStrength}</Label>
              <Slider
                value={[localStrength]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setLocalStrength(v)}
              />
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleStrengthChange(localStrength)}
                disabled={updateConnection.isPending}
              >
                Zapisz
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć połączenie?</AlertDialogTitle>
              <AlertDialogDescription>
                Czy na pewno chcesz usunąć połączenie z {connection.connected_contact?.full_name}? 
                Tej operacji nie można cofnąć.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function ContactConnectionsSection({ contactId, contactName }: ContactConnectionsSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: connections, isLoading } = useContactConnections(contactId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Sieć kontaktów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Sieć kontaktów
            {connections && connections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {connections.length}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent>
          {!connections || connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Brak połączeń w sieci kontaktów</p>
              <p className="text-xs mt-1">
                Dodaj znajomych ręcznie lub poprzez spotkania 1x1 w konsultacjach
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <ConnectionItem key={connection.id} connection={connection} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddConnectionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        preselectedContactId={contactId}
      />
    </>
  );
}

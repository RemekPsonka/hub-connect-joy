import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, Building2, User, Calendar, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTenantModal } from '@/components/superadmin/AddTenantModal';
import { EditTenantModal } from '@/components/superadmin/EditTenantModal';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function Superadmin() {
  const {
    isSuperadmin,
    isCheckingRole,
    tenants,
    isLoadingTenants,
    createTenant,
    isCreatingTenant,
    updateTenant,
    isUpdatingTenant,
    deleteTenant,
    isDeletingTenant,
  } = useSuperadmin();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<{ id: string; name: string } | null>(null);

  // Loading state
  if (isCheckingRole) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Not a superadmin - redirect
  if (!isSuperadmin) {
    return <Navigate to="/" replace />;
  }

  const handleCreateTenant = (data: {
    tenantName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerFullName: string;
  }) => {
    createTenant(data, {
      onSuccess: () => {
        setIsAddModalOpen(false);
      }
    });
  };

  const handleUpdateTenant = (data: {
    tenantId: string;
    tenantName: string;
    ownerId?: string;
    ownerFullName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
  }) => {
    updateTenant(data, {
      onSuccess: () => {
        setTenantToEdit(null);
      }
    });
  };

  const handleDeleteTenant = () => {
    if (tenantToDelete) {
      deleteTenant(tenantToDelete.id, {
        onSuccess: () => {
          setTenantToDelete(null);
        }
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Panel Superadmina
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj wszystkimi organizacjami w systemie
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nowa organizacja
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizacje ({tenants.length})</CardTitle>
          <CardDescription>
            Lista wszystkich organizacji wraz z ich właścicielami
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTenants ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak organizacji w systemie
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa organizacji</TableHead>
                  <TableHead>Właściciel</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Data utworzenia</TableHead>
                  <TableHead className="w-[100px]">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {tenant.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.owner ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {tenant.owner.full_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Brak właściciela</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.owner?.email || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(tenant.created_at), 'd MMM yyyy', { locale: pl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTenantToEdit(tenant)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setTenantToDelete({ id: tenant.id, name: tenant.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddTenantModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleCreateTenant}
        isLoading={isCreatingTenant}
      />

      <EditTenantModal
        open={!!tenantToEdit}
        onOpenChange={(open) => !open && setTenantToEdit(null)}
        tenant={tenantToEdit}
        onSubmit={handleUpdateTenant}
        isLoading={isUpdatingTenant}
      />

      <AlertDialog open={!!tenantToDelete} onOpenChange={(open) => !open && setTenantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć organizację?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć organizację <strong>{tenantToDelete?.name}</strong>?
              Ta operacja jest nieodwracalna i usunie wszystkie dane powiązane z tą organizacją.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingTenant}
            >
              {isDeletingTenant ? 'Usuwanie...' : 'Usuń organizację'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

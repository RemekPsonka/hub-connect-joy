import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Users, UserPlus, Trash2, Crown, UserCog, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useOwnerPanel, AppRole, TenantUser } from '@/hooks/useOwnerPanel';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import AddUserModal from '@/components/owner/AddUserModal';
import EditUserModal from '@/components/owner/EditUserModal';
import { AssistantsList } from '@/components/owner/AssistantsList';

const roleLabels: Record<AppRole, string> = {
  owner: 'Właściciel',
  admin: 'Administrator',
  director: 'Dyrektor',
};

const roleBadgeVariants: Record<AppRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  owner: 'default',
  admin: 'secondary',
  director: 'outline',
};

export default function Owner() {
  const { director } = useAuth();
  const {
    isAdmin,
    isAdminLoading,
    users,
    usersLoading,
    updateRole,
    isUpdatingRole,
    removeUser,
    isRemovingUser,
    updateUser,
    isUpdatingUser,
  } = useOwnerPanel();
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);

  const handleEditUser = (user: TenantUser) => {
    setEditingUser(user);
    setIsEditUserOpen(true);
  };

  const handleSaveUser = async (data: { userId: string; email?: string; fullName?: string; password?: string }) => {
    await updateUser(data);
  };

  // Loading state
  if (isAdminLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not admin - redirect
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const getHighestRole = (roles: AppRole[]): AppRole => {
    if (roles.includes('owner')) return 'owner';
    if (roles.includes('admin')) return 'admin';
    return 'director';
  };

  const canChangeRole = (targetRoles: AppRole[]): boolean => {
    return !targetRoles.includes('owner');
  };

  const canRemoveUser = (targetUserId: string, targetRoles: AppRole[]): boolean => {
    // Cannot remove self or owner
    return targetUserId !== director?.user_id && !targetRoles.includes('owner');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel zarządzania</h1>
            <p className="text-muted-foreground">Zarządzaj użytkownikami organizacji</p>
          </div>
        </div>
        <Button onClick={() => setIsAddUserOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Dodaj użytkownika
        </Button>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Użytkownicy
          </CardTitle>
          <CardDescription>
            Lista wszystkich użytkowników w organizacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Brak użytkowników
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rola</TableHead>
                      <TableHead>Data utworzenia</TableHead>
                      <TableHead className="w-[50px]">Edycja</TableHead>
                      <TableHead className="w-[50px]">Usuń</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => {
                  const highestRole = getHighestRole(user.roles);
                  const isOwner = user.roles.includes('owner');
                  const isSelf = user.user_id === director?.user_id;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
                          <span className="font-medium">{user.full_name}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-xs">Ty</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {canChangeRole(user.roles) ? (
                          <Select
                            value={highestRole}
                            onValueChange={(value: AppRole) => updateRole({ userId: user.user_id, newRole: value })}
                            disabled={isUpdatingRole}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <UserCog className="h-4 w-4" />
                                  Administrator
                                </div>
                              </SelectItem>
                              <SelectItem value="director">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Dyrektor
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={roleBadgeVariants[highestRole]}>
                            {roleLabels[highestRole]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'd MMM yyyy', { locale: pl })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                              title="Edytuj dane użytkownika"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            {canRemoveUser(user.user_id, user.roles) ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń użytkownika</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Czy na pewno chcesz usunąć użytkownika <strong>{user.full_name}</strong> z organizacji?
                                      Ta operacja jest nieodwracalna.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeUser(user.user_id)}
                                      disabled={isRemovingUser}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Usuń
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : null}
                          </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <AddUserModal 
        isOpen={isAddUserOpen} 
        onClose={() => setIsAddUserOpen(false)} 
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditUserOpen}
        onClose={() => {
          setIsEditUserOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleSaveUser}
        isLoading={isUpdatingUser}
      />
    </div>
  );
}

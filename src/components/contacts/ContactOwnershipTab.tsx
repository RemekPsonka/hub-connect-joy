import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Plus, 
  Trash2, 
  TrendingUp, 
  ExternalLink,
  Percent,
  BadgeDollarSign,
  Crown,
  Briefcase,
  User,
  Rocket
} from 'lucide-react';
import { useContactOwnerships, useRemoveOwnership, useOwnerTotalRevenue } from '@/hooks/useOwnership';
import { AddOwnershipModal } from './AddOwnershipModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContactOwnershipTabProps {
  contactId: string;
  contactName: string;
}

const roleLabels: Record<string, string> = {
  owner: 'Właściciel',
  shareholder: 'Udziałowiec',
  board_member: 'Członek zarządu',
  ceo: 'Prezes',
  founder: 'Założyciel',
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  shareholder: <Percent className="h-3 w-3" />,
  board_member: <Briefcase className="h-3 w-3" />,
  ceo: <User className="h-3 w-3" />,
  founder: <Rocket className="h-3 w-3" />,
};

export function ContactOwnershipTab({ contactId, contactName }: ContactOwnershipTabProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; companyId: string; companyName: string } | null>(null);
  
  const { data: ownerships, isLoading } = useContactOwnerships(contactId);
  const { totalRevenue, revenueDetails, currency } = useOwnerTotalRevenue(contactId);
  const removeOwnership = useRemoveOwnership();

  const formatRevenue = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(2)} mld`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} mln`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)} tys.`;
    }
    return amount.toFixed(0);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    removeOwnership.mutate({
      id: deleteConfirm.id,
      contactId,
      companyId: deleteConfirm.companyId,
    });
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgeDollarSign className="h-5 w-5 text-primary" />
            Łączny przychód z udziałów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {formatRevenue(totalRevenue)}
            </span>
            <span className="text-lg text-muted-foreground">{currency}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Na podstawie {ownerships?.length || 0} firm
          </p>
        </CardContent>
      </Card>

      {/* Companies list */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Udziały w firmach ({ownerships?.length || 0})</h3>
        <Button onClick={() => setAddModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Dodaj firmę
        </Button>
      </div>

      {ownerships && ownerships.length > 0 ? (
        <div className="space-y-3">
          {ownerships.map((ownership) => {
            const detail = revenueDetails.find(d => d.companyId === ownership.company_id);
            
            return (
              <Card key={ownership.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Company logo */}
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {ownership.company?.logo_url ? (
                        <img 
                          src={ownership.company.logo_url} 
                          alt="" 
                          className="h-10 w-10 rounded object-contain"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Company info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link 
                          to={`/companies/${ownership.company_id}`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {ownership.company?.name || 'Nieznana firma'}
                        </Link>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {ownership.ownership_percent && (
                          <Badge variant="secondary" className="gap-1">
                            <Percent className="h-3 w-3" />
                            {ownership.ownership_percent}%
                          </Badge>
                        )}
                        {ownership.role && (
                          <Badge variant="outline" className="gap-1">
                            {roleIcons[ownership.role] || <User className="h-3 w-3" />}
                            {roleLabels[ownership.role] || ownership.role}
                          </Badge>
                        )}
                        {ownership.added_by === 'ai' && (
                          <Badge variant="default" className="text-xs">AI</Badge>
                        )}
                      </div>

                      {/* Revenue info */}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {ownership.company?.revenue_amount ? (
                          <>
                            <div className="text-muted-foreground">
                              Przychód firmy: <span className="font-medium text-foreground">
                                {formatRevenue(ownership.company.revenue_amount)} {ownership.company.revenue_currency || 'PLN'}
                              </span>
                              {ownership.company.revenue_year && (
                                <span className="text-xs ml-1">({ownership.company.revenue_year})</span>
                              )}
                            </div>
                            {detail?.revenueShare && detail.revenueShare > 0 && (
                              <div className="flex items-center gap-1 text-primary">
                                <TrendingUp className="h-3 w-3" />
                                <span className="font-medium">
                                  {formatRevenue(detail.revenueShare)} {detail.currency}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Brak danych o przychodzie</span>
                        )}
                      </div>

                      {ownership.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{ownership.notes}</p>
                      )}
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirm({
                        id: ownership.id,
                        companyId: ownership.company_id,
                        companyName: ownership.company?.name || 'tej firmy',
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Brak przypisanych firm</CardTitle>
            <CardDescription>
              Dodaj firmy, w których {contactName} ma udziały, aby śledzić łączny przychód.
            </CardDescription>
            <Button onClick={() => setAddModalOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-1" />
              Dodaj pierwszą firmę
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add modal */}
      <AddOwnershipModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        contactId={contactId}
        contactName={contactName}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć udział?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć udział w firmie {deleteConfirm?.companyName}? 
              Ta akcja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

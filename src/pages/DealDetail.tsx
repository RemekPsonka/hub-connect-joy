import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  Percent,
  TrendingUp,
  Trophy,
  XCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeal,
  useUpdateDeal,
  useDeleteDeal,
  useDealActivities,
  useCreateDealActivity,
} from '@/hooks/useDeals';
import { DealStageBadge, DealActivitiesTimeline, DealProductsCard } from '@/components/deals';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: deal, isLoading } = useDeal(id);
  const { data: activities = [], isLoading: activitiesLoading } = useDealActivities(id);
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const createActivity = useCreateDealActivity();

  const handleMarkAsWon = async () => {
    if (!deal) return;
    await updateDeal.mutateAsync({
      id: deal.id,
      status: 'won',
      won_at: new Date().toISOString(),
    });
    await createActivity.mutateAsync({
      deal_id: deal.id,
      activity_type: 'stage_change',
      description: 'Deal oznaczony jako wygrany',
      old_value: deal.status,
      new_value: 'won',
    });
  };

  const handleMarkAsLost = async () => {
    if (!deal) return;
    await updateDeal.mutateAsync({
      id: deal.id,
      status: 'lost',
    });
    await createActivity.mutateAsync({
      deal_id: deal.id,
      activity_type: 'stage_change',
      description: 'Deal oznaczony jako przegrany',
      old_value: deal.status,
      new_value: 'lost',
    });
  };

  const handleDelete = async () => {
    if (!deal) return;
    await deleteDeal.mutateAsync(deal.id);
    navigate('/deals');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Deal nie znaleziony</h2>
        <Button variant="outline" onClick={() => navigate('/deals')}>
          Wróć do listy
        </Button>
      </div>
    );
  }

  const expectedRevenue = deal.value * (deal.probability / 100);

  const statusConfig = {
    open: { label: 'Otwarty', variant: 'secondary' as const },
    won: { label: 'Wygrany', variant: 'default' as const },
    lost: { label: 'Przegrany', variant: 'destructive' as const },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/deals')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do pipeline
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{deal.title}</h1>
            <Badge variant={statusConfig[deal.status].variant}>
              {statusConfig[deal.status].label}
            </Badge>
          </div>
          {deal.stage && (
            <DealStageBadge name={deal.stage.name} color={deal.stage.color} />
          )}
        </div>

        {deal.status === 'open' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
              onClick={handleMarkAsWon}
              disabled={updateDeal.isPending}
            >
              {updateDeal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trophy className="h-4 w-4" />
              )}
              Wygrany
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
              onClick={handleMarkAsLost}
              disabled={updateDeal.isPending}
            >
              <XCircle className="h-4 w-4" />
              Przegrany
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć deal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ta operacja jest nieodwracalna. Deal zostanie trwale usunięty.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deal.value.toLocaleString('pl-PL', {
                style: 'currency',
                currency: deal.currency,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prawdopodobieństwo</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deal.probability}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekiwany przychód</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expectedRevenue.toLocaleString('pl-PL', {
                style: 'currency',
                currency: deal.currency,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Szczegóły</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.contact && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Kontakt</p>
                  <Link
                    to={`/contacts/${deal.contact.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {deal.contact.full_name}
                  </Link>
                </div>
              </div>
            )}

            {deal.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Firma</p>
                  <Link
                    to={`/companies/${deal.company.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {deal.company.name}
                  </Link>
                </div>
              </div>
            )}

            {deal.expected_close_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Oczekiwana data zamknięcia</p>
                  <p className="font-medium">
                    {format(new Date(deal.expected_close_date), 'd MMMM yyyy', {
                      locale: pl,
                    })}
                  </p>
                </div>
              </div>
            )}

            {deal.source && (
              <div>
                <p className="text-sm text-muted-foreground">Źródło</p>
                <Badge variant="outline" className="mt-1">
                  {deal.source}
                </Badge>
              </div>
            )}

            {deal.owner && (
              <div>
                <p className="text-sm text-muted-foreground">Właściciel</p>
                <p className="font-medium">{deal.owner.full_name}</p>
              </div>
            )}

            {deal.description && (
              <div>
                <p className="text-sm text-muted-foreground">Opis</p>
                <p className="text-sm mt-1">{deal.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <DealActivitiesTimeline
          activities={activities}
          isLoading={activitiesLoading}
        />
      </div>

      {/* Products Section */}
      <DealProductsCard
        dealId={deal.id}
        currency={deal.currency}
        onValueChange={async (total) => {
          await updateDeal.mutateAsync({ id: deal.id, value: total });
          await createActivity.mutateAsync({
            deal_id: deal.id,
            activity_type: 'value_change',
            description: 'Wartość zaktualizowana na podstawie produktów',
            old_value: deal.value.toString(),
            new_value: total.toString(),
          });
        }}
      />
    </div>
  );
}

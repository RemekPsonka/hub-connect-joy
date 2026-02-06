import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  XCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useDealProducts } from '@/hooks/useDealProducts';
import { useDealTeamWithMembers } from '@/hooks/useDealTeams';
import { DealStageBadge, DealOverview, DealProducts, DealTimeline } from '@/components/deals';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: deal, isLoading } = useDeal(id);
  const { data: activities = [], isLoading: activitiesLoading } = useDealActivities(id);
  const { data: products = [] } = useDealProducts(id!);
  const { data: teamDetails } = useDealTeamWithMembers(deal?.team_id);
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

  const handleValueChange = async (total: number) => {
    if (!deal) return;
    await updateDeal.mutateAsync({ id: deal.id, value: total });
    await createActivity.mutateAsync({
      deal_id: deal.id,
      activity_type: 'value_change',
      description: 'Wartość zaktualizowana na podstawie produktów',
      old_value: deal.value.toString(),
      new_value: total.toString(),
    });
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
            <DealStageBadge name={deal.stage.name} color={deal.stage.color || '#6366f1'} />
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="products">
            Produkty ({products.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Historia</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DealOverview deal={deal} teamDetails={teamDetails} />
        </TabsContent>

        <TabsContent value="products">
          <DealProducts
            dealId={deal.id}
            currency={deal.currency}
            onValueChange={handleValueChange}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <DealTimeline
            activities={activities}
            isLoading={activitiesLoading}
            currency={deal.currency}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

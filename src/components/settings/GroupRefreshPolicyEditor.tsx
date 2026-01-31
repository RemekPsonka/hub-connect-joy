import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Save, RefreshCw } from 'lucide-react';

interface ContactGroup {
  id: string;
  name: string;
  color: string | null;
  refresh_policy: string | null;
  refresh_days: number | null;
  include_in_health_stats: boolean | null;
}

const REFRESH_POLICIES = [
  { value: 'monthly', label: 'Co miesiąc (30 dni)', days: 30 },
  { value: 'quarterly', label: 'Co kwartał (90 dni)', days: 90 },
  { value: 'biannual', label: 'Co pół roku (180 dni)', days: 180 },
  { value: 'annual', label: 'Co rok (365 dni)', days: 365 },
  { value: 'never', label: 'Pomijaj w statystykach', days: null },
];

export function GroupRefreshPolicyEditor() {
  const { director } = useAuth();
  const queryClient = useQueryClient();
  const [editedGroups, setEditedGroups] = useState<Map<string, Partial<ContactGroup>>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['contact-groups-policies', director?.tenant_id],
    queryFn: async (): Promise<ContactGroup[]> => {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('id, name, color, refresh_policy, refresh_days, include_in_health_stats')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!director?.tenant_id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Array.from(editedGroups.entries()).map(([id, changes]) => {
        const policy = REFRESH_POLICIES.find(p => p.value === changes.refresh_policy);
        return supabase
          .from('contact_groups')
          .update({
            refresh_policy: changes.refresh_policy,
            refresh_days: policy?.days ?? null,
            include_in_health_stats: changes.refresh_policy !== 'never',
          })
          .eq('id', id);
      });

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-groups-policies'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-to-renew'] });
      queryClient.invalidateQueries({ queryKey: ['relationship-health'] });
      setEditedGroups(new Map());
      setHasChanges(false);
      toast.success('Polityki odświeżania zostały zapisane');
    },
    onError: (error) => {
      console.error('Error saving refresh policies:', error);
      toast.error('Nie udało się zapisać zmian');
    },
  });

  const handlePolicyChange = (groupId: string, policy: string) => {
    setEditedGroups(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(groupId) || {};
      newMap.set(groupId, { ...existing, refresh_policy: policy });
      return newMap;
    });
    setHasChanges(true);
  };

  const getGroupPolicy = (group: ContactGroup) => {
    const edited = editedGroups.get(group.id);
    return edited?.refresh_policy ?? group.refresh_policy ?? 'quarterly';
  };

  const getPolicyLabel = (policy: string) => {
    return REFRESH_POLICIES.find(p => p.value === policy)?.label || policy;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Polityka odświeżania kontaktów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Brak grup kontaktów do skonfigurowania.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Polityka odświeżania kontaktów
          </CardTitle>
          <CardDescription>
            Określ jak często kontakty w każdej grupie powinny być "odświeżane" (kontaktowane).
            Grupy oznaczone jako "Pomijaj" nie będą uwzględniane w statystykach zdrowia sieci.
          </CardDescription>
        </div>
        {hasChanges && (
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupa</TableHead>
              <TableHead>Częstotliwość odświeżania</TableHead>
              <TableHead className="text-center">W statystykach</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const policy = getGroupPolicy(group);
              const isExcluded = policy === 'never';
              
              return (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.color || '#6366f1' }}
                      />
                      <span className="font-medium">{group.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={policy}
                      onValueChange={(value) => handlePolicyChange(group.id, value)}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REFRESH_POLICIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    {isExcluded ? (
                      <Badge variant="secondary">Pomijana</Badge>
                    ) : (
                      <Badge variant="default">Tak</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

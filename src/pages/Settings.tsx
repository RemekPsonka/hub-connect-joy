import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Brain, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EmbeddingStats {
  contacts_with: number;
  contacts_total: number;
  needs_with: number;
  needs_total: number;
  offers_with: number;
  offers_total: number;
}

interface MissingEmbeddings {
  contacts: string[];
  needs: string[];
  offers: string[];
}

export default function Settings() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState({ current: 0, total: 0 });
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch tenant ID
  useEffect(() => {
    async function fetchTenantId() {
      if (!user) return;
      
      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (director) {
        setTenantId(director.tenant_id);
      }
    }
    fetchTenantId();
  }, [user]);

  // Fetch embedding stats
  useEffect(() => {
    async function fetchStats() {
      if (!tenantId) return;
      
      setIsLoadingStats(true);
      try {
        // Fetch counts in parallel
        const [
          { count: contactsTotal },
          { count: contactsWithEmbedding },
          { count: needsTotal },
          { count: needsWithEmbedding },
          { count: offersTotal },
          { count: offersWithEmbedding }
        ] = await Promise.all([
          supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).not('profile_embedding', 'is', null),
          supabase.from('needs').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabase.from('needs').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).not('embedding', 'is', null),
          supabase.from('offers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabase.from('offers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).not('embedding', 'is', null),
        ]);

        setStats({
          contacts_with: contactsWithEmbedding || 0,
          contacts_total: contactsTotal || 0,
          needs_with: needsWithEmbedding || 0,
          needs_total: needsTotal || 0,
          offers_with: offersWithEmbedding || 0,
          offers_total: offersTotal || 0,
        });
      } catch (error) {
        console.error('Failed to fetch embedding stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    }
    
    fetchStats();
  }, [tenantId]);

  // Get records missing embeddings
  async function getMissingEmbeddings(): Promise<MissingEmbeddings> {
    if (!tenantId) return { contacts: [], needs: [], offers: [] };

    const [
      { data: contacts },
      { data: needs },
      { data: offers }
    ] = await Promise.all([
      supabase.from('contacts').select('id').eq('tenant_id', tenantId).is('profile_embedding', null),
      supabase.from('needs').select('id').eq('tenant_id', tenantId).is('embedding', null),
      supabase.from('offers').select('id').eq('tenant_id', tenantId).is('embedding', null),
    ]);

    return {
      contacts: contacts?.map(c => c.id) || [],
      needs: needs?.map(n => n.id) || [],
      offers: offers?.map(o => o.id) || [],
    };
  }

  // Regenerate all embeddings
  async function handleRegenerateAll() {
    setIsRegenerating(true);
    const toastId = toast.loading('Pobieranie listy rekordów bez embeddingów...');

    try {
      const missing = await getMissingEmbeddings();
      const total = missing.contacts.length + missing.needs.length + missing.offers.length;

      if (total === 0) {
        toast.success('Wszystkie rekordy mają już embeddingi!', { id: toastId });
        setIsRegenerating(false);
        return;
      }

      setRegenerationProgress({ current: 0, total });
      toast.loading(`Generowanie embeddingów: 0 z ${total}...`, { id: toastId });

      let processed = 0;
      let successCount = 0;
      let errorCount = 0;

      // Process contacts
      for (const id of missing.contacts) {
        try {
          const { error } = await supabase.functions.invoke('generate-embedding', {
            body: { type: 'contact', id }
          });
          if (!error) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
        processed++;
        setRegenerationProgress({ current: processed, total });
        toast.loading(`Generowanie embeddingów: ${processed} z ${total}...`, { id: toastId });
      }

      // Process needs
      for (const id of missing.needs) {
        try {
          const { error } = await supabase.functions.invoke('generate-embedding', {
            body: { type: 'need', id }
          });
          if (!error) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
        processed++;
        setRegenerationProgress({ current: processed, total });
        toast.loading(`Generowanie embeddingów: ${processed} z ${total}...`, { id: toastId });
      }

      // Process offers
      for (const id of missing.offers) {
        try {
          const { error } = await supabase.functions.invoke('generate-embedding', {
            body: { type: 'offer', id }
          });
          if (!error) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
        processed++;
        setRegenerationProgress({ current: processed, total });
        toast.loading(`Generowanie embeddingów: ${processed} z ${total}...`, { id: toastId });
      }

      // Show result
      if (errorCount === 0) {
        toast.success(`Wygenerowano ${successCount} embeddingów!`, { id: toastId });
      } else {
        toast.warning(`Wygenerowano ${successCount} embeddingów, ${errorCount} błędów.`, { id: toastId });
      }

      // Refresh stats
      setTenantId(prev => prev); // Trigger re-fetch
    } catch (error) {
      console.error('Regeneration failed:', error);
      toast.error('Błąd podczas regeneracji embeddingów', { id: toastId });
    } finally {
      setIsRegenerating(false);
      setRegenerationProgress({ current: 0, total: 0 });
    }
  }

  const totalMissing = stats 
    ? (stats.contacts_total - stats.contacts_with) + 
      (stats.needs_total - stats.needs_with) + 
      (stats.offers_total - stats.offers_with)
    : 0;

  const totalRecords = stats 
    ? stats.contacts_total + stats.needs_total + stats.offers_total 
    : 0;

  const totalWithEmbeddings = stats 
    ? stats.contacts_with + stats.needs_with + stats.offers_with 
    : 0;

  const percentComplete = totalRecords > 0 
    ? Math.round((totalWithEmbeddings / totalRecords) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
        <p className="text-muted-foreground">Zarządzaj ustawieniami aplikacji</p>
      </div>
      
      {/* AI Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Wyszukiwanie AI
          </CardTitle>
          <CardDescription>
            Zarządzaj embeddingami do wyszukiwania semantycznego
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          {isLoadingStats ? (
            <div className="text-muted-foreground">Ładowanie statystyk...</div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Overall progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ogólny postęp indeksowania</span>
                  <span className="font-medium">{percentComplete}%</span>
                </div>
                <Progress value={percentComplete} className="h-2" />
              </div>

              {/* Detailed stats */}
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Kontakty z embeddingiem</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.contacts_with} z {stats.contacts_total}</span>
                    {stats.contacts_with === stats.contacts_total ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Potrzeby z embeddingiem</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.needs_with} z {stats.needs_total}</span>
                    {stats.needs_with === stats.needs_total ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Oferty z embeddingiem</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.offers_with} z {stats.offers_total}</span>
                    {stats.offers_with === stats.offers_total ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Regenerate button */}
              <div className="pt-4 border-t">
                <Button
                  onClick={handleRegenerateAll}
                  disabled={isRegenerating || totalMissing === 0}
                  className="w-full"
                >
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generowanie: {regenerationProgress.current} z {regenerationProgress.total}
                    </>
                  ) : totalMissing > 0 ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regeneruj brakujące embeddingi ({totalMissing})
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Wszystkie embeddingi są aktualne
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Embeddingi umożliwiają wyszukiwanie semantyczne - znajdowanie wyników 
                  na podstawie znaczenia, nie tylko dokładnego dopasowania słów.
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Placeholder for other settings */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Pozostałe ustawienia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Dodatkowe opcje konfiguracji zostaną wkrótce dodane.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Brain, RefreshCw, CheckCircle, AlertCircle, Info, DollarSign, Tags } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SynonymsDictionary } from '@/components/settings/SynonymsDictionary';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { GroupManagementModal } from '@/components/settings/GroupManagementModal';
import { useContactGroups } from '@/hooks/useContactGroups';

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
  const [isCancelled, setIsCancelled] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const { data: groups = [] } = useContactGroups();

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

  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [tenantId, refreshKey]);

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

  // Cancel regeneration
  function handleCancel() {
    setIsCancelled(true);
    toast.info('Anulowanie... poczekaj na zakończenie bieżącego rekordu');
  }

  // Regenerate all embeddings
  async function handleRegenerateAll() {
    setIsRegenerating(true);
    setIsCancelled(false);
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
      toast.loading(`Generowanie embeddingów (OpenAI): 0 z ${total}...`, { id: toastId });

      let processed = 0;
      let successCount = 0;
      let errorCount = 0;

      // Process contacts
      for (const id of missing.contacts) {
        if (isCancelled) break;
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
        toast.loading(`Generowanie embeddingów (OpenAI): ${processed} z ${total}...`, { id: toastId });
        
        // Rate limiting: 100ms delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Process needs
      for (const id of missing.needs) {
        if (isCancelled) break;
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
        toast.loading(`Generowanie embeddingów (OpenAI): ${processed} z ${total}...`, { id: toastId });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Process offers
      for (const id of missing.offers) {
        if (isCancelled) break;
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
        toast.loading(`Generowanie embeddingów (OpenAI): ${processed} z ${total}...`, { id: toastId });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Show result
      if (isCancelled) {
        toast.info(`Anulowano. Wygenerowano ${successCount} embeddingów.`, { id: toastId });
      } else if (errorCount === 0) {
        toast.success(`✓ Wygenerowano ${successCount} embeddingów!`, { id: toastId });
      } else {
        toast.warning(`Wygenerowano ${successCount} embeddingów, ${errorCount} błędów.`, { id: toastId });
      }

      // Refresh stats
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Regeneration failed:', error);
      toast.error('Błąd podczas regeneracji embeddingów', { id: toastId });
    } finally {
      setIsRegenerating(false);
      setIsCancelled(false);
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

  // Estimate cost: ~200 tokens per record, $0.02 per 1M tokens
  const estimatedCost = totalMissing > 0 
    ? ((totalMissing * 200) / 1000000 * 0.02).toFixed(4)
    : '0.00';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
        <p className="text-muted-foreground">Zarządzaj ustawieniami aplikacji</p>
      </div>

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* Contact Groups Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Grupy kontaktów
          </CardTitle>
          <CardDescription>
            Zarządzaj grupami do kategoryzacji kontaktów
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {groups.length === 0 
                ? 'Brak zdefiniowanych grup' 
                : `${groups.length} ${groups.length === 1 ? 'grupa' : groups.length < 5 ? 'grupy' : 'grup'}`}
            </div>
            <Button onClick={() => setIsGroupModalOpen(true)}>
              Zarządzaj grupami
            </Button>
          </div>
          
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  style={{ 
                    backgroundColor: `${group.color}20`, 
                    color: group.color || '#6366f1',
                    border: `1px solid ${group.color}40`
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: group.color || '#6366f1' }} 
                  />
                  {group.name}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Synonyms Dictionary */}
      <SynonymsDictionary />
      
      {/* AI Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Wyszukiwanie Semantyczne AI
          </CardTitle>
          <CardDescription>
            Embeddingi OpenAI do inteligentnego wyszukiwania (text-embedding-3-small)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info box */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Embeddingi AI</strong> pozwalają znaleźć np. "biomasa" gdy szukasz "pellet", 
              lub "ubezpieczenie" gdy szukasz "ochrona". System automatycznie rozumie synonimy i powiązane pojęcia.
            </AlertDescription>
          </Alert>

          {/* Stats */}
          {isLoadingStats ? (
            <div className="text-muted-foreground">Ładowanie statystyk...</div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Overall progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pokrycie embeddingami</span>
                  <span className="font-medium">{totalWithEmbeddings} z {totalRecords} ({percentComplete}%)</span>
                </div>
                <Progress value={percentComplete} className="h-2" />
              </div>

              {/* Detailed stats */}
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Kontakty</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.contacts_with} z {stats.contacts_total}</span>
                    {stats.contacts_with === stats.contacts_total && stats.contacts_total > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : stats.contacts_total > 0 ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Potrzeby</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.needs_with} z {stats.needs_total}</span>
                    {stats.needs_with === stats.needs_total && stats.needs_total > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : stats.needs_total > 0 ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Oferty</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.offers_with} z {stats.offers_total}</span>
                    {stats.offers_with === stats.offers_total && stats.offers_total > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : stats.offers_total > 0 ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Cost estimate */}
              {totalMissing > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <DollarSign className="h-4 w-4" />
                  <span>Szacowany koszt regeneracji: ~${estimatedCost} ({totalMissing} rekordów)</span>
                </div>
              )}

              {/* Regenerate button */}
              <div className="pt-4 border-t space-y-3">
                {isRegenerating ? (
                  <div className="space-y-2">
                    <Progress 
                      value={(regenerationProgress.current / regenerationProgress.total) * 100} 
                      className="h-2" 
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Generowanie: {regenerationProgress.current} z {regenerationProgress.total}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleRegenerateAll}
                    disabled={totalMissing === 0}
                    className="w-full"
                  >
                    {totalMissing > 0 ? (
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
                )}
                <p className="text-xs text-muted-foreground">
                  Używa OpenAI text-embedding-3-small (~$0.02 za 1000 rekordów). 
                  Może potrwać kilka minut dla dużych baz danych.
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

      {/* Group Management Modal */}
      <GroupManagementModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
      />
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, Loader2, Database, Building2, Users, Info, CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SyncJob {
  id: string;
  job_type: string;
  status: string | null;
  progress: {
    processed: number;
    total: number;
    errors: number;
    companies_created?: number;
    last_id?: string;
  };
  logs: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>;
  started_at: string | null;
  completed_at: string | null;
  updated_at?: string;
}

interface Stats {
  totalCompanies: number;
  completedCompanies: number;
  pendingCompanies: number;
  errorCompanies: number;
  inProgressCompanies: number;
  contactsWithoutCompany: number;
  contactsWithBusinessEmail: number;
}

export function BatchKRSSyncController() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    completedCompanies: 0,
    pendingCompanies: 0,
    errorCompanies: 0,
    inProgressCompanies: 0,
    contactsWithoutCompany: 0,
    contactsWithBusinessEmail: 0
  });
  const [emailJob, setEmailJob] = useState<SyncJob | null>(null);
  const [krsJob, setKrsJob] = useState<SyncJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateOlderThan, setUpdateOlderThan] = useState<Date | undefined>(undefined);
  const [olderThanCount, setOlderThanCount] = useState<number>(0);
  const [isCountingOlder, setIsCountingOlder] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Get tenant ID
  useEffect(() => {
    const fetchTenantId = async () => {
      if (!user) return;
      
      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (director) {
        setTenantId(director.tenant_id);
      }
    };
    
    fetchTenantId();
  }, [user]);

  // Fetch initial stats
  const fetchStats = useCallback(async () => {
    if (!tenantId) return;

    try {
      const [
        totalRes,
        completedRes,
        pendingRes,
        errorRes,
        inProgressRes,
        noCompanyRes,
        businessEmailRes
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('source_data_status', 'completed'),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).or('source_data_status.eq.pending,source_data_status.is.null'),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('source_data_status', 'error'),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('source_data_status', ['in_progress', 'processing']),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('company_id', null).is('company_verified_at', null).eq('is_active', true),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('company_id', null).is('company_verified_at', null).eq('is_active', true).not('email', 'is', null)
      ]);

      setStats({
        totalCompanies: totalRes.count || 0,
        completedCompanies: completedRes.count || 0,
        pendingCompanies: pendingRes.count || 0,
        errorCompanies: errorRes.count || 0,
        inProgressCompanies: inProgressRes.count || 0,
        contactsWithoutCompany: noCompanyRes.count || 0,
        contactsWithBusinessEmail: businessEmailRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [tenantId]);

  // Check if job is stale (no updates for 5+ minutes)
  const isJobStale = useCallback((job: SyncJob): boolean => {
    const lastLog = job.logs?.[job.logs.length - 1];
    if (!lastLog) return true;
    const lastUpdate = new Date(lastLog.timestamp);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdate < fiveMinutesAgo;
  }, []);

  // Fetch active jobs
  const fetchJobs = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data: jobs } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['running', 'paused'])
        .order('created_at', { ascending: false });

      if (jobs) {
        const email = jobs.find(j => j.job_type === 'create_companies_from_emails');
        const krs = jobs.find(j => j.job_type === 'krs_sync');
        
        setEmailJob(email ? ({
          ...email,
          status: email.status ?? 'pending',
          progress: email.progress as SyncJob['progress'],
          logs: email.logs as SyncJob['logs']
        } as SyncJob) : null);
        
        setKrsJob(krs ? ({
          ...krs,
          status: krs.status ?? 'pending',
          progress: krs.progress as SyncJob['progress'],
          logs: krs.logs as SyncJob['logs']
        } as SyncJob) : null);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  }, [tenantId]);

  // Cleanup stale jobs on mount
  useEffect(() => {
    const cleanupStaleJobs = async () => {
      if (!tenantId) return;
      
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      // Mark stale running jobs as paused
      await supabase
        .from('sync_jobs')
        .update({ status: 'paused' })
        .eq('tenant_id', tenantId)
        .eq('status', 'running')
        .lt('updated_at', tenMinutesAgo);
        
      // Reset stuck companies
      await supabase
        .from('companies')
        .update({ source_data_status: 'pending' })
        .eq('tenant_id', tenantId)
        .in('source_data_status', ['in_progress', 'processing']);
    };
    
    if (tenantId) {
      cleanupStaleJobs();
    }
  }, [tenantId]);

  // Initial load
  useEffect(() => {
    if (tenantId) {
      setIsLoading(true);
      Promise.all([fetchStats(), fetchJobs()]).finally(() => setIsLoading(false));
    }
  }, [tenantId, fetchStats, fetchJobs]);

  // Polling for active jobs
  useEffect(() => {
    const hasActiveJob = (emailJob?.status === 'running') || (krsJob?.status === 'running');
    
    if (hasActiveJob) {
      pollingRef.current = setInterval(() => {
        fetchJobs();
        fetchStats();
      }, 5000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [emailJob?.status, krsJob?.status, fetchJobs, fetchStats]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [emailJob?.logs, krsJob?.logs]);

  // Count companies older than selected date
  useEffect(() => {
    const countOlderCompanies = async () => {
      if (!tenantId || !updateOlderThan) {
        setOlderThanCount(0);
        return;
      }
      
      setIsCountingOlder(true);
      try {
        const isoDate = updateOlderThan.toISOString();
        const { count } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('source_data_status', 'completed')
          .or(`source_data_date.lt.${isoDate},source_data_date.is.null`);
        
        setOlderThanCount(count || 0);
      } catch (error) {
        console.error('Error counting older companies:', error);
      } finally {
        setIsCountingOlder(false);
      }
    };
    
    countOlderCompanies();
  }, [tenantId, updateOlderThan]);

  // Reset companies older than date to pending
  const resetOlderThanDate = async () => {
    if (!tenantId || !updateOlderThan || olderThanCount === 0) return;

    try {
      const isoDate = updateOlderThan.toISOString();
      const { error } = await supabase
        .from('companies')
        .update({ source_data_status: 'pending' })
        .eq('tenant_id', tenantId)
        .eq('source_data_status', 'completed')
        .or(`source_data_date.lt.${isoDate},source_data_date.is.null`);

      if (error) throw error;

      toast.success(`Zresetowano ${olderThanCount} firm do ponownej weryfikacji`);
      setUpdateOlderThan(undefined);
      setOlderThanCount(0);
      await fetchStats();
    } catch (error: any) {
      toast.error('Błąd: ' + error.message);
    }
  };

  // Resume pending sync (reset stuck + start new job)
  const resumePendingSync = async () => {
    if (!tenantId) return;

    try {
      // 1. Reset any stuck in_progress/processing companies
      if (stats.inProgressCompanies > 0) {
        await supabase
          .from('companies')
          .update({ source_data_status: 'pending' })
          .eq('tenant_id', tenantId)
          .in('source_data_status', ['in_progress', 'processing']);
      }

      // 2. Mark any stale running jobs as completed
      await supabase
        .from('sync_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('job_type', 'krs_sync')
        .eq('status', 'running');

      // 3. Start fresh job
      await startKrsJob();
      await fetchStats();
    } catch (error: any) {
      toast.error('Błąd: ' + error.message);
    }
  };

  // Start creating companies from emails
  const startEmailJob = async () => {
    if (!tenantId) return;

    try {
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('sync_jobs')
        .insert({
          tenant_id: tenantId,
          job_type: 'create_companies_from_emails',
          status: 'running',
          started_at: new Date().toISOString(),
          progress: { processed: 0, total: 0, errors: 0, companies_created: 0 },
          logs: [{ timestamp: new Date().toISOString(), message: '🚀 Rozpoczynam tworzenie firm z domen email...', type: 'info' }]
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setEmailJob(({
        ...job,
        status: job.status ?? 'running',
        progress: job.progress as SyncJob['progress'],
        logs: job.logs as SyncJob['logs']
      } as SyncJob));

      // Invoke edge function
      await supabase.functions.invoke('create-companies-from-emails', {
        body: { job_id: job.id, tenant_id: tenantId, batch_size: 50 }
      });

      toast.success('Rozpoczęto tworzenie firm z emaili');
    } catch (error: any) {
      console.error('Error starting email job:', error);
      toast.error('Błąd: ' + error.message);
    }
  };

  // Start KRS sync
  const startKrsJob = async () => {
    if (!tenantId) return;

    try {
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('sync_jobs')
        .insert({
          tenant_id: tenantId,
          job_type: 'krs_sync',
          status: 'running',
          started_at: new Date().toISOString(),
          progress: { processed: 0, total: 0, errors: 0 },
          logs: [{ timestamp: new Date().toISOString(), message: '🚀 Rozpoczynam synchronizację KRS...', type: 'info' }]
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setKrsJob(({
        ...job,
        status: job.status ?? 'running',
        progress: job.progress as SyncJob['progress'],
        logs: job.logs as SyncJob['logs']
      } as SyncJob));

      // Invoke edge function
      await supabase.functions.invoke('background-sync-runner', {
        body: { job_id: job.id, tenant_id: tenantId, batch_size: 10 }
      });

      toast.success('Rozpoczęto synchronizację KRS w tle');
    } catch (error: any) {
      console.error('Error starting KRS job:', error);
      toast.error('Błąd: ' + error.message);
    }
  };

  // Pause job
  const pauseJob = async (jobId: string) => {
    try {
      await supabase
        .from('sync_jobs')
        .update({ status: 'paused' })
        .eq('id', jobId);

      toast.info('Synchronizacja zostanie wstrzymana po bieżącej partii');
      await fetchJobs();
    } catch (error: any) {
      toast.error('Błąd: ' + error.message);
    }
  };

  // Resume job
  const resumeJob = async (job: SyncJob) => {
    try {
      await supabase
        .from('sync_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);

      // Re-invoke the appropriate function
      if (job.job_type === 'create_companies_from_emails') {
        await supabase.functions.invoke('create-companies-from-emails', {
          body: { job_id: job.id, tenant_id: tenantId, batch_size: 50 }
        });
      } else {
        await supabase.functions.invoke('background-sync-runner', {
          body: { job_id: job.id, tenant_id: tenantId, batch_size: 10 }
        });
      }

      toast.success('Wznowiono synchronizację');
      await fetchJobs();
    } catch (error: any) {
      toast.error('Błąd: ' + error.message);
    }
  };

  // Reset errors to pending
  const resetErrors = async () => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ source_data_status: 'pending' })
        .eq('tenant_id', tenantId)
        .eq('source_data_status', 'error');

      if (error) throw error;

      toast.success('Zresetowano błędne firmy');
      await fetchStats();
    } catch (error: any) {
      toast.error('Błąd: ' + error.message);
    }
  };

  const emailProgress = emailJob?.progress.total 
    ? Math.round((emailJob.progress.processed / emailJob.progress.total) * 100) 
    : 0;

  const krsProgress = krsJob?.progress.total 
    ? Math.round((krsJob.progress.processed / krsJob.progress.total) * 100) 
    : 0;

  // Check if KRS job exists but is stale
  const krsJobIsStale = krsJob && krsJob.status === 'running' && isJobStale(krsJob);

  // Total pending including stuck companies
  const totalPending = stats.pendingCompanies + stats.inProgressCompanies;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Create companies from emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Krok 1: Tworzenie firm z domen email
          </CardTitle>
          <CardDescription>
            Automatycznie tworzy firmy na podstawie domen email kontaktów bez przypisanej firmy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.contactsWithoutCompany}</div>
              <div className="text-xs text-muted-foreground">Kontakty bez firmy</div>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.contactsWithBusinessEmail}</div>
              <div className="text-xs text-muted-foreground">Z firmowym emailem</div>
            </div>
          </div>

          {emailJob ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Postęp: {emailJob.progress.processed}/{emailJob.progress.total}</span>
                <span>{emailProgress}%</span>
              </div>
              <Progress value={emailProgress} className="h-2" />
              
              {emailJob.progress.companies_created !== undefined && (
                <div className="text-sm text-muted-foreground">
                  Utworzono {emailJob.progress.companies_created} nowych firm
                </div>
              )}

              <div className="flex gap-2">
                {emailJob.status === 'running' ? (
                  <Button onClick={() => pauseJob(emailJob.id)} variant="secondary" className="flex-1">
                    <Pause className="h-4 w-4 mr-2" />
                    Wstrzymaj
                  </Button>
                ) : (
                  <Button onClick={() => resumeJob(emailJob)} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Wznów
                  </Button>
                )}
              </div>

              {emailJob.status === 'running' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Proces działa w tle. Możesz opuścić tę stronę - synchronizacja będzie kontynuowana.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Button 
              onClick={startEmailJob} 
              className="w-full"
              disabled={stats.contactsWithBusinessEmail === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Utwórz firmy z emaili ({stats.contactsWithBusinessEmail} kontaktów)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: KRS Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Krok 2: Synchronizacja danych KRS
          </CardTitle>
          <CardDescription>
            Pobiera dane rejestrowe (KRS/CEIDG) dla wszystkich firm oczekujących na weryfikację
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <div className="text-xs text-muted-foreground">Łącznie firm</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completedCompanies}</div>
              <div className="text-xs text-muted-foreground">Zweryfikowane</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.errorCompanies}</div>
              <div className="text-xs text-muted-foreground">Błędy</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
              <div className="text-xs text-muted-foreground">Oczekujące</div>
            </div>
          </div>

          {/* Active job display */}
          {krsJob && !krsJobIsStale ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Postęp: {krsJob.progress.processed}/{krsJob.progress.total}</span>
                <span>{krsProgress}%</span>
              </div>
              <Progress value={krsProgress} className="h-2" />

              <div className="flex gap-2">
                {krsJob.status === 'running' ? (
                  <Button onClick={() => pauseJob(krsJob.id)} variant="secondary" className="flex-1">
                    <Pause className="h-4 w-4 mr-2" />
                    Wstrzymaj
                  </Button>
                ) : (
                  <Button onClick={() => resumeJob(krsJob)} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Wznów
                  </Button>
                )}
                <Button 
                  onClick={resetErrors} 
                  variant="outline"
                  disabled={stats.errorCompanies === 0}
                  title="Resetuj błędne firmy do ponownego przetworzenia"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {krsJob.status === 'running' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Proces działa w tle. Możesz opuścić tę stronę - synchronizacja będzie kontynuowana.
                  </AlertDescription>
                </Alert>
              )}

              {/* Logs */}
              {krsJob.logs && krsJob.logs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Logi</div>
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="space-y-1">
                      {krsJob.logs.map((log, i) => (
                        <div 
                          key={i} 
                          className={`text-xs font-mono flex gap-2 ${
                            log.type === 'error' ? 'text-red-500' :
                            log.type === 'success' ? 'text-green-500' :
                            log.type === 'warning' ? 'text-yellow-500' :
                            'text-muted-foreground'
                          }`}
                        >
                          <span className="opacity-50">
                            {new Date(log.timestamp).toLocaleTimeString('pl-PL')}
                          </span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stale job warning */}
              {krsJobIsStale && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    Poprzednia synchronizacja została przerwana. Użyj przycisku poniżej, aby dokończyć oczekujące firmy.
                  </AlertDescription>
                </Alert>
              )}

              {/* Continue pending button - shown when there are pending companies and no active job */}
              {totalPending > 0 && (
                <Button 
                  onClick={resumePendingSync} 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {krsJobIsStale ? 'Dokończ' : 'Rozpocznij'} synchronizację ({totalPending} firm)
                </Button>
              )}

              {/* Date picker for updating older entries */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {updateOlderThan 
                      ? `Aktualizuj wpisy starsze niż ${format(updateOlderThan, 'd MMMM yyyy', { locale: pl })}`
                      : 'Aktualizuj wpisy starsze niż...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={updateOlderThan}
                    onSelect={setUpdateOlderThan}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {updateOlderThan && (
                    <div className="p-3 border-t space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {isCountingOlder ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Liczenie...
                          </span>
                        ) : (
                          <>Znaleziono <strong>{olderThanCount}</strong> firm do aktualizacji</>
                        )}
                      </div>
                      <Button 
                        onClick={resetOlderThanDate} 
                        disabled={olderThanCount === 0 || isCountingOlder}
                        className="w-full"
                        size="sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resetuj do ponownej weryfikacji
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {/* Reset errors button */}
              {stats.errorCompanies > 0 && (
                <Button 
                  onClick={resetErrors} 
                  variant="outline" 
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetuj {stats.errorCompanies} błędnych firm
                </Button>
              )}

              {/* Show message when nothing to sync */}
              {totalPending === 0 && stats.errorCompanies === 0 && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Wszystkie firmy są zweryfikowane. Użyj date picker powyżej, aby zaktualizować starsze wpisy.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

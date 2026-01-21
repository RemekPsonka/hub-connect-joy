import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, CheckCircle2, XCircle, Loader2, Database } from 'lucide-react';

interface SyncStats {
  total: number;
  completed: number;
  errors: number;
  remaining: number;
  processed: number;
}

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function BatchKRSSyncController() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState<SyncStats>({
    total: 0,
    completed: 0,
    errors: 0,
    remaining: 0,
    processed: 0
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastProcessedId, setLastProcessedId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of logs when new log added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  const fetchInitialStats = async () => {
    try {
      const [totalRes, completedRes, errorRes, pendingRes] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('source_data_status', 'completed'),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('source_data_status', 'error'),
        supabase.from('companies').select('*', { count: 'exact', head: true }).or('source_data_status.eq.pending,source_data_status.is.null'),
      ]);

      setStats({
        total: totalRes.count || 0,
        completed: completedRes.count || 0,
        errors: errorRes.count || 0,
        remaining: pendingRes.count || 0,
        processed: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchInitialStats();
  }, []);

  const runBatch = async () => {
    if (isRunning && !isPaused) return;

    setIsRunning(true);
    setIsPaused(false);
    abortRef.current = false;

    addLog('🚀 Rozpoczynam synchronizację danych KRS...', 'info');

    let batchNumber = 0;
    let totalProcessed = 0;

    while (!abortRef.current) {
      batchNumber++;
      addLog(`📦 Przetwarzam partię #${batchNumber} (10 firm)...`, 'info');

      try {
        const { data, error } = await supabase.functions.invoke('batch-krs-sync', {
          body: { 
            batch_size: 10,
            start_from_id: lastProcessedId
          }
        });

        if (error) {
          addLog(`❌ Błąd funkcji: ${error.message}`, 'error');
          // Wait and retry
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        if (data.done) {
          addLog('✅ Wszystkie firmy zostały przetworzone!', 'success');
          toast.success('Synchronizacja KRS zakończona!');
          setIsRunning(false);
          break;
        }

        // Update stats
        totalProcessed += data.processed || 0;
        setStats({
          total: data.total || stats.total,
          completed: data.completed || 0,
          errors: data.errors || 0,
          remaining: data.remaining || 0,
          processed: totalProcessed
        });

        // Log individual results
        if (data.results) {
          for (const result of data.results) {
            if (result.status === 'completed') {
              const krsInfo = result.krs ? ` (KRS: ${result.krs})` : ' (brak KRS)';
              addLog(`✓ ${result.name}${krsInfo}`, 'success');
            } else {
              addLog(`✗ ${result.name}: ${result.error || 'błąd'}`, 'error');
            }
          }
        }

        setLastProcessedId(data.last_processed_id);

        // Short delay between batches
        if (!abortRef.current && data.remaining > 0) {
          addLog(`⏳ Czekam 3s przed następną partią... (pozostało: ${data.remaining})`, 'info');
          await new Promise(r => setTimeout(r, 3000));
        }

      } catch (e: any) {
        addLog(`❌ Wyjątek: ${e.message}`, 'error');
        // Wait and retry
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (abortRef.current) {
      addLog('⏸️ Synchronizacja zatrzymana przez użytkownika', 'warning');
    }

    setIsRunning(false);
  };

  const pauseSync = () => {
    abortRef.current = true;
    setIsPaused(true);
    addLog('⏸️ Zatrzymuję po zakończeniu bieżącej partii...', 'warning');
  };

  const resetSync = async () => {
    if (isRunning) {
      toast.error('Najpierw zatrzymaj synchronizację');
      return;
    }

    // Reset all companies to pending
    const { error } = await supabase
      .from('companies')
      .update({ source_data_status: 'pending' })
      .neq('source_data_status', 'completed');

    if (error) {
      toast.error('Błąd resetowania: ' + error.message);
      return;
    }

    setLastProcessedId(null);
    setLogs([]);
    await fetchInitialStats();
    addLog('🔄 Zresetowano status firm błędnych do "pending"', 'info');
    toast.success('Status firm zresetowany');
  };

  const progress = stats.total > 0 
    ? Math.round(((stats.completed + stats.errors) / stats.total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Synchronizacja danych KRS
        </CardTitle>
        <CardDescription>
          Automatyczne pobieranie danych z KRS/CEIDG dla wszystkich firm w bazie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Łącznie firm</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Zakończone</div>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <div className="text-xs text-muted-foreground">Błędy</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.remaining}</div>
            <div className="text-xs text-muted-foreground">Oczekujące</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Postęp synchronizacji</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={runBatch} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              {lastProcessedId ? 'Wznów' : 'Rozpocznij'} synchronizację
            </Button>
          ) : (
            <Button onClick={pauseSync} variant="secondary" className="flex-1">
              <Pause className="h-4 w-4 mr-2" />
              Zatrzymaj
            </Button>
          )}
          <Button 
            onClick={resetSync} 
            variant="outline" 
            disabled={isRunning}
            title="Resetuj błędne firmy do ponownego przetworzenia"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Synchronizacja w toku...
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Logi</div>
            <ScrollArea className="h-48 border rounded-lg p-2">
              <div className="space-y-1">
                {logs.map((log, i) => (
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
                      {log.timestamp.toLocaleTimeString('pl-PL')}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

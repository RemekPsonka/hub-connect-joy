import { useState } from 'react';
import { Upload, Users, Plus, RefreshCw, MoreHorizontal, UserCheck, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProspectingImportDialog } from './ProspectingImportDialog';
import { ProspectingList } from './ProspectingList';
import { useLayoutMode } from '@/store/layoutMode';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useSGUProspects, type SGUProspect } from '@/hooks/useSGUProspects';
import { AddLeadDialog } from '@/components/sgu/AddLeadDialog';
import { ImportLeadsDialog } from '@/components/sgu/ImportLeadsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import { AIKRSPanel } from '@/components/sgu/AIKRSPanel';

interface Props {
  teamId: string;
}

export function ProspectingTab({ teamId }: Props) {
  const [showImport, setShowImport] = useState(false);
  const { mode } = useLayoutMode();
  const isSgu = mode === 'sgu';

  return (
    <div className="space-y-6">
      {isSgu && <SGUProspectingSection />}

      {!isSgu && (
        <>
          {/* Header — CRM mode (meeting prospects) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Lista Prospecting</h3>
            </div>
            <Button onClick={() => setShowImport(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importuj listę
            </Button>
          </div>

          <ProspectingList teamId={teamId} />

          <ProspectingImportDialog
            open={showImport}
            onOpenChange={setShowImport}
            teamId={teamId}
          />
        </>
      )}
    </div>
  );
}

function SGUProspectingSection() {
  const qc = useQueryClient();
  const { isPartner, hasAccess } = useSGUAccess();
  const [showAdd, setShowAdd] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const { data: prospects = [], isLoading, refetch } = useSGUProspects({ showArchived });
  const canManage = isPartner || hasAccess;

  const handleConvert = async () => {
    if (!convertId) return;
    const { error } = await supabase
      .from('deal_team_contacts')
      .update({ category: 'client', status: 'active' })
      .eq('id', convertId);
    if (error) {
      toast.error('Nie udało się oznaczyć: ' + error.message);
    } else {
      toast.success('Oznaczono jako klient');
      qc.invalidateQueries({ queryKey: ['sgu-prospects'] });
      qc.invalidateQueries({ queryKey: ['deal-team-contacts'] });
    }
    setConvertId(null);
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    const { error } = await supabase
      .from('deal_team_contacts')
      .update({ status: 'inactive' })
      .eq('id', archiveId);
    if (error) {
      toast.error('Nie udało się zarchiwizować: ' + error.message);
    } else {
      toast.success('Zarchiwizowano');
      qc.invalidateQueries({ queryKey: ['sgu-prospects'] });
    }
    setArchiveId(null);
  };

  return (
    <Tabs defaultValue="leads" className="space-y-4">
      <TabsList>
        <TabsTrigger value="leads">Leady ({prospects.length})</TabsTrigger>
        {canManage && (
          <TabsTrigger value="ai-krs" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI KRS
          </TabsTrigger>
        )}
      </TabsList>

      {canManage && (
        <TabsContent value="ai-krs">
          <AIKRSPanel />
        </TabsContent>
      )}

      <TabsContent value="leads" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Prospecting SGU</h3>
          <Badge variant="secondary">{prospects.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
            Pokaż zarchiwizowane
          </label>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Odśwież
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowImportCsv(true)} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Importuj CSV
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Dodaj lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : prospects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Brak leadów w lejku SGU</p>
          {canManage && <p className="text-sm">Dodaj ręcznie lub zaimportuj z CSV</p>}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {prospects.map((p) => (
            <ProspectRow
              key={p.id}
              p={p}
              canManage={canManage}
              onConvert={() => setConvertId(p.id)}
              onArchive={() => setArchiveId(p.id)}
            />
          ))}
        </div>
      )}

      <AddLeadDialog open={showAdd} onOpenChange={setShowAdd} />
      <ImportLeadsDialog open={showImportCsv} onOpenChange={setShowImportCsv} />

      <AlertDialog open={!!convertId} onOpenChange={(o) => !o && setConvertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oznaczyć jako klient?</AlertDialogTitle>
            <AlertDialogDescription>
              Lead zostanie przeniesiony do zakładki „Klienci" w lejku SGU.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert}>Oznacz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zarchiwizować leada?</AlertDialogTitle>
            <AlertDialogDescription>
              Lead zostanie ukryty (status „inactive"). Dane pozostają w bazie i można je przywrócić.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Zarchiwizuj</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </TabsContent>
    </Tabs>
  );
}

function ProspectRow({
  p,
  canManage,
  onConvert,
  onArchive,
}: {
  p: SGUProspect;
  canManage: boolean;
  onConvert: () => void;
  onArchive: () => void;
}) {
  const isSguNative = !p.source_contact_id;
  const isArchived = p.status === 'inactive';
  const name = p.contact?.full_name ?? '— bez nazwy —';

  return (
    <div className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{name}</span>
          {isSguNative ? (
            <Badge variant="outline" className="text-xs">SGU-native</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Z CRM</Badge>
          )}
          {isArchived && (
            <Badge variant="destructive" className="text-xs">Zarchiwizowane</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
          {p.contact?.phone && (
            <a href={`tel:${p.contact.phone}`} className="hover:underline">
              {p.contact.phone}
            </a>
          )}
          {p.contact?.email && <span>{p.contact.email}</span>}
          {!!p.expected_annual_premium_gr && (
            <span>
              {(p.expected_annual_premium_gr / 100).toLocaleString('pl-PL')} PLN/rok
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {p.category === 'lead' && !isArchived && (
              <DropdownMenuItem onClick={onConvert}>
                <UserCheck className="h-4 w-4 mr-2" />
                Oznacz jako klient
              </DropdownMenuItem>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem disabled>
                      <Users className="h-4 w-4 mr-2" />
                      Przypisz do rep
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Dostępne po SGU-09 (onboarding repów)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuSeparator />
            {!isArchived && (
              <DropdownMenuItem onClick={onArchive} className="text-destructive">
                <Archive className="h-4 w-4 mr-2" />
                Archiwizuj
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

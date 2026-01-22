import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn } from '@/lib/utils';
import { 
  Wrench, 
  CheckCircle2, 
  MoreVertical, 
  Trash2, 
  ExternalLink,
  ImageOff,
  X,
  Clock,
  Play,
  FlaskConical,
  Pencil,
} from 'lucide-react';
import { EditBugReportModal } from './EditBugReportModal';
import { BugFixSheet } from './BugFixSheet';
import { useUpdateBugReport, useUpdateBugReportStatus, useAddFixNote } from '@/hooks/useBugReports';
import type { BugReport } from '@/hooks/useBugReports';

interface BugReportCardProps {
  report: BugReport;
  onUpdateStatus: (id: string, status: string, notes?: string) => void;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  critical: { color: 'border-l-red-500', label: '🔴 Krytyczny' },
  high: { color: 'border-l-orange-500', label: '🟠 Wysoki' },
  medium: { color: 'border-l-yellow-500', label: '🟡 Średni' },
  low: { color: 'border-l-green-500', label: '🟢 Niski' },
};

const statusConfig = {
  new: { variant: 'secondary' as const, label: 'Nowe', icon: Clock },
  in_progress: { variant: 'default' as const, label: 'W trakcie', icon: Play },
  testing: { variant: 'outline' as const, label: 'Testowanie', icon: FlaskConical },
  resolved: { variant: 'default' as const, label: 'Rozwiązane', icon: CheckCircle2 },
  cancelled: { variant: 'secondary' as const, label: 'Anulowane', icon: X },
};

export function BugReportCard({ report, onUpdateStatus, onDelete }: BugReportCardProps) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFixSheet, setShowFixSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateBugReport = useUpdateBugReport();
  const updateStatus = useUpdateBugReportStatus();
  const addFixNote = useAddFixNote();

  const priority = priorityConfig[report.priority];
  const status = statusConfig[report.status];
  const StatusIcon = status.icon;

  const handleStartFix = () => {
    // First update status to in_progress, then open the sheet
    onUpdateStatus(report.id, 'in_progress');
    setShowFixSheet(true);
  };

  const handleOpenFixSheet = () => {
    setShowFixSheet(true);
  };

  const handleFixSheetStatusChange = (newStatus: string) => {
    onUpdateStatus(report.id, newStatus);
    if (newStatus === 'resolved' || newStatus === 'cancelled') {
      setShowFixSheet(false);
    }
  };

  const handleAddNote = (note: string) => {
    addFixNote.mutate({
      id: report.id,
      note,
      currentContextData: report.context_data as Record<string, unknown> | null,
    });
  };

  const handleSaveEdit = (data: { title: string; description: string; priority: string }) => {
    updateBugReport.mutate(
      { id: report.id, ...data },
      { onSuccess: () => setShowEditDialog(false) }
    );
  };

  const handleDelete = () => {
    onDelete(report.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className={cn('border-l-4', priority.color)}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Screenshot thumbnail */}
            <div 
              className="w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-muted cursor-pointer"
              onClick={() => report.screenshot_url && setShowScreenshot(true)}
            >
              {report.screenshot_url ? (
                <img
                  src={report.screenshot_url}
                  alt="Zrzut ekranu"
                  className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium truncate">{report.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={status.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {report.description}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{priority.label}</span>
                <span>•</span>
                <span>{format(new Date(report.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}</span>
                {report.page_url && (
                  <>
                    <span>•</span>
                    <a
                      href={report.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(report.page_url).pathname}
                    </a>
                  </>
                )}
              </div>

              {report.resolution_notes && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Notatka:</strong> {report.resolution_notes}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {report.status === 'new' && (
                <Button size="sm" onClick={handleStartFix}>
                  <Wrench className="h-4 w-4 mr-1" />
                  Napraw
                </Button>
              )}

              {report.status === 'in_progress' && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={handleOpenFixSheet}
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  Kontynuuj
                </Button>
              )}

              {report.status === 'testing' && (
                <Button 
                  size="sm" 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onUpdateStatus(report.id, 'resolved')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Rozwiązane
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edytuj
                  </DropdownMenuItem>
                  {report.status !== 'in_progress' && report.status !== 'resolved' && (
                    <DropdownMenuItem onClick={handleStartFix}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Rozpocznij naprawę
                    </DropdownMenuItem>
                  )}
                  {report.status === 'in_progress' && (
                    <DropdownMenuItem onClick={handleOpenFixSheet}>
                      <Play className="h-4 w-4 mr-2" />
                      Otwórz panel naprawy
                    </DropdownMenuItem>
                  )}
                  {report.status !== 'cancelled' && report.status !== 'resolved' && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(report.id, 'cancelled')}>
                      <X className="h-4 w-4 mr-2" />
                      Anuluj zgłoszenie
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot dialog */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Zrzut ekranu</DialogTitle>
          </DialogHeader>
          {report.screenshot_url && (
            <img
              src={report.screenshot_url}
              alt="Zrzut ekranu"
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <EditBugReportModal
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        report={report}
        onSave={handleSaveEdit}
        isSaving={updateBugReport.isPending}
      />

      {/* Fix sheet */}
      <BugFixSheet
        open={showFixSheet}
        onOpenChange={setShowFixSheet}
        report={report}
        onUpdateStatus={handleFixSheetStatusChange}
        onAddNote={handleAddNote}
        isUpdating={updateStatus.isPending || addFixNote.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń zgłoszenie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć to zgłoszenie? Tej operacji nie można cofnąć.
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
    </>
  );
}

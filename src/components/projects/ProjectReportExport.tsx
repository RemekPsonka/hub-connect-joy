import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getStatusConfig } from '@/hooks/useProjects';
import type { ProjectWithOwner } from '@/hooks/useProjects';

interface ProjectReportExportProps {
  project: ProjectWithOwner;
}

export function ProjectReportExport({ project }: ProjectReportExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      // Fetch all data in parallel
      const [tasksRes, milestonesRes, timeRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, owner_id, estimated_hours')
          .eq('project_id', project.id)
          .is('parent_task_id', null),
        supabase
          .from('project_milestones')
          .select('*')
          .eq('project_id', project.id)
          .order('due_date'),
        supabase
          .from('task_time_entries')
          .select('duration_minutes, task_id')
          .in(
            'task_id',
            (
              await supabase
                .from('tasks')
                .select('id')
                .eq('project_id', project.id)
            ).data?.map((t) => t.id) || []
          ),
      ]);

      const tasks = tasksRes.data || [];
      const milestones = milestonesRes.data || [];
      const timeEntries = timeRes.data || [];

      // Calculate stats
      const totalTasks = tasks.length;
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const overdue = tasks.filter(
        (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
      );
      const unassigned = tasks.filter((t) => !t.owner_id);
      const totalMinutes = timeEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
      const totalEstimated = tasks.reduce((s, t) => s + ((t as any).estimated_hours || 0), 0);

      // Generate PDF using jspdf
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const statusCfg = getStatusConfig(project.status);

      // Header
      doc.setFontSize(18);
      doc.text(project.name, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Status: ${statusCfg.label} | Wygenerowano: ${format(new Date(), 'd MMM yyyy HH:mm', { locale: pl })}`, 14, 28);
      if (project.description) {
        doc.text(doc.splitTextToSize(project.description, 180), 14, 35);
      }

      let y = project.description ? 45 : 35;

      // Summary
      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.text('Podsumowanie', 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Metryka', 'Wartość']],
        body: [
          ['Zadania (ukończone / łącznie)', `${completed} / ${totalTasks}`],
          ['Postęp', `${totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0}%`],
          ['Czas zalogowany', `${Math.round(totalMinutes / 60 * 10) / 10}h`],
          ['Czas szacowany', `${totalEstimated}h`],
          ['Zadania przeterminowane', `${overdue.length}`],
          ['Zadania bez przypisania', `${unassigned.length}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Milestones
      if (milestones.length > 0) {
        doc.setFontSize(13);
        doc.text('Kamienie milowe', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Nazwa', 'Termin', 'Status']],
          body: milestones.map((m) => [
            m.name,
            m.due_date ? format(new Date(m.due_date), 'd MMM yyyy', { locale: pl }) : '—',
            m.status === 'completed' ? 'Ukończony' : m.status === 'in_progress' ? 'W toku' : 'Oczekuje',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [124, 58, 237] },
          styles: { fontSize: 9 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Tasks table
      if (tasks.length > 0) {
        if (y > 250) { doc.addPage(); y = 14; }
        doc.setFontSize(13);
        doc.text('Zadania', 14, y);
        y += 6;

        const priorityMap: Record<string, string> = { high: 'Wysoki', medium: 'Średni', low: 'Niski' };
        const statusMap: Record<string, string> = {
          pending: 'Oczekuje', in_progress: 'W toku', completed: 'Zakończone', cancelled: 'Anulowane',
        };

        autoTable(doc, {
          startY: y,
          head: [['Tytuł', 'Status', 'Priorytet', 'Termin']],
          body: tasks.map((t) => [
            t.title,
            statusMap[t.status || 'pending'] || t.status,
            priorityMap[t.priority || 'medium'] || t.priority,
            t.due_date ? format(new Date(t.due_date), 'd MMM yyyy', { locale: pl }) : '—',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [124, 58, 237] },
          styles: { fontSize: 8 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Risks section
      if (overdue.length > 0 || unassigned.length > 0) {
        if (y > 250) { doc.addPage(); y = 14; }
        doc.setFontSize(13);
        doc.setTextColor(200, 0, 0);
        doc.text('Ryzyka', 14, y);
        doc.setTextColor(0);
        y += 6;

        const risks: string[][] = [];
        overdue.forEach((t) => risks.push([t.title, 'Przeterminowane', t.due_date ? format(new Date(t.due_date), 'd MMM', { locale: pl }) : '']));
        unassigned.forEach((t) => risks.push([t.title, 'Brak przypisania', '']));

        autoTable(doc, {
          startY: y,
          head: [['Zadanie', 'Ryzyko', 'Termin']],
          body: risks,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] },
          styles: { fontSize: 9 },
        });
      }

      doc.save(`raport-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('Raport PDF wygenerowany');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Błąd generowania raportu');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={handleExport} disabled={isGenerating} className="shrink-0">
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}

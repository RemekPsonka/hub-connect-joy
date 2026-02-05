import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileJson, Loader2, Users, Building2, Calendar, CheckSquare, Lightbulb, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExportEntity {
  key: string;
  label: string;
  table: 'contacts' | 'companies' | 'consultations' | 'tasks' | 'needs' | 'offers';
  columns: string;
  icon: React.ReactNode;
}

const EXPORT_ENTITIES: ExportEntity[] = [
  { 
    key: 'contacts', 
    label: 'Kontakty', 
    table: 'contacts',
    columns: 'full_name,email,phone,company,position,city,tags,created_at,last_contact_date',
    icon: <Users className="h-5 w-5 text-blue-500" />
  },
  { 
    key: 'companies', 
    label: 'Firmy', 
    table: 'companies',
    columns: 'name,nip,krs,city,industry,company_status,employee_count,revenue_amount,created_at',
    icon: <Building2 className="h-5 w-5 text-purple-500" />
  },
  { 
    key: 'consultations', 
    label: 'Konsultacje', 
    table: 'consultations',
    columns: 'scheduled_at,status,notes,ai_summary,duration_minutes,location',
    icon: <Calendar className="h-5 w-5 text-green-500" />
  },
  { 
    key: 'tasks', 
    label: 'Zadania', 
    table: 'tasks',
    columns: 'title,description,status,priority,due_date,created_at',
    icon: <CheckSquare className="h-5 w-5 text-orange-500" />
  },
  { 
    key: 'needs', 
    label: 'Potrzeby', 
    table: 'needs',
    columns: 'title,description,category,status,priority,created_at',
    icon: <Lightbulb className="h-5 w-5 text-yellow-500" />
  },
  { 
    key: 'offers', 
    label: 'Oferty', 
    table: 'offers',
    columns: 'title,description,category,status,created_at',
    icon: <Package className="h-5 w-5 text-indigo-500" />
  },
];

export function DataExportSettings() {
  const [exporting, setExporting] = useState<Record<string, boolean>>({});

  const getDateString = () => new Date().toISOString().split('T')[0];

  async function exportToExcel(entity: ExportEntity) {
    const exportKey = `${entity.key}_excel`;
    setExporting(prev => ({ ...prev, [exportKey]: true }));
    
    try {
      const { data, error } = await supabase
        .from(entity.table)
        .select(entity.columns)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, entity.label);
      
      const dateStr = getDateString();
      XLSX.writeFile(wb, `${entity.key}_export_${dateStr}.xlsx`);
      
      toast.success('Eksport zakończony', { 
        description: `Pobrano ${data?.length || 0} rekordów do Excel` 
      });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Błąd eksportu', { description: String(err) });
    } finally {
      setExporting(prev => ({ ...prev, [exportKey]: false }));
    }
  }

  async function exportToJson(entity: ExportEntity) {
    const exportKey = `${entity.key}_json`;
    setExporting(prev => ({ ...prev, [exportKey]: true }));
    
    try {
      const { data, error } = await supabase
        .from(entity.table)
        .select(entity.columns)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = getDateString();
      a.download = `${entity.key}_export_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Eksport zakończony', { 
        description: `Pobrano ${data?.length || 0} rekordów do JSON` 
      });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Błąd eksportu', { description: String(err) });
    } finally {
      setExporting(prev => ({ ...prev, [exportKey]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Eksport danych CRM
        </CardTitle>
        <CardDescription>
          Pobierz pełne dane z systemu w formacie Excel lub JSON
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y rounded-lg border">
          {EXPORT_ENTITIES.map((entity) => {
            const isExportingExcel = exporting[`${entity.key}_excel`];
            const isExportingJson = exporting[`${entity.key}_json`];
            
            return (
              <div 
                key={entity.key} 
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {entity.icon}
                  <span className="font-medium">{entity.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToExcel(entity)}
                    disabled={isExportingExcel || isExportingJson}
                  >
                    {isExportingExcel ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    <span className="ml-1">Excel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToJson(entity)}
                    disabled={isExportingExcel || isExportingJson}
                  >
                    {isExportingJson ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="h-4 w-4" />
                    )}
                    <span className="ml-1">JSON</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <span className="text-amber-500">⚠️</span>
          Dane są filtrowane według Twojego konta (tenant).
        </p>
      </CardContent>
    </Card>
  );
}

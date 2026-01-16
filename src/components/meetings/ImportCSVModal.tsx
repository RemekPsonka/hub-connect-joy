import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { useContacts, useCreateContact } from '@/hooks/useContacts';
import { useBulkAddParticipants } from '@/hooks/useMeetings';
import { toast } from 'sonner';

interface ImportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
}

interface ParsedRow {
  name: string;
  email: string;
  company: string;
  matchedContactId?: string;
  isNew: boolean;
}

export function ImportCSVModal({ open, onOpenChange, meetingId }: ImportCSVModalProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: contactsData } = useContacts({});
  const existingContacts = Array.isArray(contactsData) ? contactsData : contactsData?.data ?? [];
  const createContact = useCreateContact();
  const bulkAddParticipants = useBulkAddParticipants();

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const nameIndex = headers.findIndex((h) => h.includes('name') || h.includes('imię') || h.includes('nazwisko'));
    const emailIndex = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    const companyIndex = headers.findIndex((h) => h.includes('company') || h.includes('firma'));

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const name = values[nameIndex] || '';
      const email = values[emailIndex] || '';
      const company = values[companyIndex] || '';

      if (!name) continue;

      // Try to match with existing contacts by email
      const matchedContact = email
        ? existingContacts.find((c) => c.email?.toLowerCase() === email.toLowerCase())
        : null;

      rows.push({
        name,
        email,
        company,
        matchedContactId: matchedContact?.id,
        isNew: !matchedContact,
      });
    }

    return rows;
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    } else {
      toast.error('Proszę wybrać plik CSV');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    try {
      const participants: Array<{ contactId: string; isMember: boolean; isNew: boolean }> = [];

      for (const row of parsedData) {
        let contactId = row.matchedContactId;

        // Create new contact if not matched
        if (!contactId) {
          const newContact = await createContact.mutateAsync({
            full_name: row.name,
            email: row.email || undefined,
            company: row.company || undefined,
            source: 'csv_import',
          });
          contactId = newContact.id;
        }

        participants.push({
          contactId,
          isMember: false,
          isNew: row.isNew,
        });
      }

      await bulkAddParticipants.mutateAsync({ meetingId, participants });
      toast.success(`Zaimportowano ${participants.length} uczestników`);
      onOpenChange(false);
      setParsedData([]);
    } catch (error) {
      toast.error('Błąd podczas importu');
    } finally {
      setIsProcessing(false);
    }
  };

  const newCount = parsedData.filter((r) => r.isNew).length;
  const existingCount = parsedData.filter((r) => !r.isNew).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importuj uczestników z CSV</DialogTitle>
          <DialogDescription>
            Plik CSV powinien zawierać kolumny: name (lub imię), email, company (lub firma)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {parsedData.length === 0 ? (
            <Card
              className={`border-2 border-dashed transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Przeciągnij plik CSV tutaj
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  lub kliknij przycisk poniżej, aby wybrać plik
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file);
                    };
                    input.click();
                  }}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Wybierz plik CSV
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Check className="h-4 w-4" />
                    {existingCount} istniejących kontaktów
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    {newCount} nowych do utworzenia
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setParsedData([])}
                >
                  Wyczyść
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imię i nazwisko</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-muted-foreground">{row.email || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{row.company || '—'}</TableCell>
                          <TableCell>
                            {row.isNew ? (
                              <span className="text-amber-600 text-sm">Nowy</span>
                            ) : (
                              <span className="text-emerald-600 text-sm">Istnieje</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.length > 10 && (
                    <div className="px-4 py-2 text-sm text-muted-foreground border-t">
                      ...i {parsedData.length - 10} więcej
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || isProcessing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isProcessing ? 'Importowanie...' : `Importuj ${parsedData.length} uczestników`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Copy, Check, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { toast } from 'sonner';

const formSchema = z.object({
  full_name: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  email: z.string().email('Nieprawidłowy adres email'),
  role_type: z.enum(['sales_rep', 'ambassador']),
});

type FormData = z.infer<typeof formSchema>;

interface AddRepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreatedRepData {
  email: string;
  fullName: string;
  tempPassword: string;
}

export function AddRepresentativeModal({ isOpen, onClose }: AddRepresentativeModalProps) {
  const { createRepresentative } = useRepresentatives();
  const [createdRep, setCreatedRep] = useState<CreatedRepData | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role_type: 'sales_rep',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createRepresentative.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        role_type: data.role_type,
      });
      setCreatedRep({
        email: result.representative.email,
        fullName: result.representative.fullName,
        tempPassword: result.tempPassword,
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCopy = () => {
    if (createdRep?.tempPassword) {
      navigator.clipboard.writeText(createdRep.tempPassword);
      setCopied(true);
      toast.success('Hasło skopiowane do schowka');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (!createdRep) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dane logowania - ${createdRep.fullName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            margin: 0;
            color: #1f2937;
            font-size: 24px;
          }
          .credentials {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin: 20px 0;
          }
          .credential-row {
            margin: 12px 0;
          }
          .label {
            font-weight: 600;
            color: #374151;
            display: block;
            margin-bottom: 4px;
          }
          .value {
            font-family: monospace;
            font-size: 16px;
            background: white;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            display: inline-block;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 16px;
            margin-top: 24px;
          }
          .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
          }
          .warning-text {
            color: #78350f;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dane logowania do systemu</h1>
          <p style="color: #6b7280; margin-top: 8px;">${createdRep.fullName}</p>
        </div>
        
        <div class="credentials">
          <div class="credential-row">
            <span class="label">📧 Email:</span>
            <span class="value">${createdRep.email}</span>
          </div>
          <div class="credential-row">
            <span class="label">🔑 Hasło tymczasowe:</span>
            <span class="value">${createdRep.tempPassword}</span>
          </div>
          <div class="credential-row">
            <span class="label">🌐 Adres logowania:</span>
            <span class="value">${window.location.origin}</span>
          </div>
        </div>
        
        <div class="warning">
          <div class="warning-title">⚠️ Ważne!</div>
          <div class="warning-text">
            Po pierwszym zalogowaniu zmień hasło na własne w ustawieniach konta.
            Nie udostępniaj tych danych osobom trzecim.
          </div>
        </div>
        
        <div class="footer">
          Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleClose = () => {
    form.reset();
    setCreatedRep(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {createdRep ? '✅ Przedstawiciel utworzony!' : 'Dodaj przedstawiciela'}
          </DialogTitle>
          <DialogDescription>
            {createdRep 
              ? 'Przekaż poniższe dane logowania przedstawicielowi.'
              : 'Utwórz konto dla nowego przedstawiciela handlowego lub ambasadora.'
            }
          </DialogDescription>
        </DialogHeader>

        {createdRep ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">📧 Email:</p>
                <code className="bg-white border rounded px-3 py-1.5 text-sm block">
                  {createdRep.email}
                </code>
              </div>
              
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">🔑 Hasło tymczasowe:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded px-3 py-1.5 font-mono text-sm">
                    {createdRep.tempPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    title="Kopiuj hasło"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                ⚠️ Przedstawiciel powinien zmienić hasło po pierwszym logowaniu.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Drukuj instrukcję
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Zamknij
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię i nazwisko *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jan Kowalski" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jan@firma.pl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ roli</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales_rep">Przedstawiciel handlowy</SelectItem>
                        <SelectItem value="ambassador">Ambasador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={createRepresentative.isPending}>
                  {createRepresentative.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Utwórz przedstawiciela
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

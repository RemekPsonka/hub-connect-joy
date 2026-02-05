import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCompaniesWithRevenue } from '@/hooks/useCompanies';
import { useAddOwnership } from '@/hooks/useOwnership';
import { Building2, Search, Loader2 } from 'lucide-react';

interface AddOwnershipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
}

export function AddOwnershipModal({ open, onOpenChange, contactId, contactName }: AddOwnershipModalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [ownershipPercent, setOwnershipPercent] = useState<string>('');
  const [role, setRole] = useState<string>('owner');
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: companies, isLoading: companiesLoading } = useCompaniesWithRevenue();
  const addOwnership = useAddOwnership();

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSubmit = () => {
    if (!selectedCompanyId) return;

    addOwnership.mutate({
      contactId,
      companyId: selectedCompanyId,
      ownershipPercent: ownershipPercent ? parseFloat(ownershipPercent) : undefined,
      role,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setSelectedCompanyId('');
    setOwnershipPercent('');
    setRole('owner');
    setNotes('');
    setSearchQuery('');
  };

  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Przypisz firmę do właściciela
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Właściciel: <span className="font-medium text-foreground">{contactName}</span>
          </div>

          {/* Company search */}
          <div className="space-y-2">
            <Label>Firma</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj firmy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {searchQuery && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {companiesLoading ? (
                  <div className="p-3 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Ładowanie...
                  </div>
                ) : filteredCompanies.length > 0 ? (
                  filteredCompanies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setSelectedCompanyId(company.id);
                        setSearchQuery('');
                      }}
                      className="w-full p-2 text-left hover:bg-accent flex items-center gap-2"
                    >
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="" loading="lazy" className="h-6 w-6 rounded object-contain" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{company.name}</span>
                      {company.revenue_amount && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {(company.revenue_amount / 1000000).toFixed(1)}M {company.revenue_currency || 'PLN'}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-muted-foreground">
                    Brak wyników
                  </div>
                )}
              </div>
            )}

            {selectedCompany && (
              <div className="flex items-center gap-2 p-2 bg-accent rounded-md">
                {selectedCompany.logo_url ? (
                  <img src={selectedCompany.logo_url} alt="" loading="lazy" className="h-8 w-8 rounded object-contain" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedCompany.name}</p>
                  {selectedCompany.revenue_amount && (
                    <p className="text-xs text-muted-foreground">
                      Przychód: {(selectedCompany.revenue_amount / 1000000).toFixed(1)}M {selectedCompany.revenue_currency || 'PLN'}
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedCompanyId('')}
                >
                  ✕
                </Button>
              </div>
            )}
          </div>

          {/* Ownership percent */}
          <div className="space-y-2">
            <Label htmlFor="ownership-percent">Udział (%)</Label>
            <div className="relative">
              <Input
                id="ownership-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="np. 51"
                value={ownershipPercent}
                onChange={(e) => setOwnershipPercent(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Rola</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Właściciel</SelectItem>
                <SelectItem value="shareholder">Udziałowiec</SelectItem>
                <SelectItem value="board_member">Członek zarządu</SelectItem>
                <SelectItem value="ceo">Prezes</SelectItem>
                <SelectItem value="founder">Założyciel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
            <Textarea
              id="notes"
              placeholder="Dodatkowe informacje o udziale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedCompanyId || addOwnership.isPending}
          >
            {addOwnership.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Przypisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

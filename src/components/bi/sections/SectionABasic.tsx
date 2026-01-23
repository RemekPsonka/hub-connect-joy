import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Building } from 'lucide-react';
import type { SectionABasic } from '../types';

const BRANZE_OPTIONS = [
  { value: 'ubezpieczenia_finanse', label: 'Ubezpieczenia i Finanse' },
  { value: 'hr_rekrutacja', label: 'HR i Rekrutacja' },
  { value: 'marketing_reklama', label: 'Marketing i Reklama' },
  { value: 'it_technologia', label: 'IT i Technologia' },
  { value: 'budownictwo_nieruchomosci', label: 'Budownictwo i Nieruchomości' },
  { value: 'transport_logistyka', label: 'Transport i Logistyka' },
  { value: 'energia_ekologia', label: 'Energia i Ekologia' },
  { value: 'produkcja_przemysl', label: 'Produkcja i Przemysł' },
  { value: 'medycyna_zdrowie', label: 'Medycyna i Zdrowie' },
  { value: 'prawo_doradztwo', label: 'Prawo i Doradztwo' },
  { value: 'handel_sprzedaz', label: 'Handel i Sprzedaż' },
  { value: 'gastronomia_hotelarstwo', label: 'Gastronomia i Hotelarstwo' },
  { value: 'rolnictwo_zywnosc', label: 'Rolnictwo i Żywność' },
  { value: 'tekstylia_moda', label: 'Tekstylia i Moda' },
  { value: 'meble_wnetrza', label: 'Meble i Wnętrza' },
  { value: 'edukacja', label: 'Edukacja' },
  { value: 'inne', label: 'Inne' },
] as const;

interface SectionABasicProps {
  data: SectionABasic;
  contactName?: string;
  companyName?: string;
  onChange: (data: SectionABasic) => void;
}

export function SectionABasicComponent({ data, contactName, companyName, onChange }: SectionABasicProps) {
  const updateField = <K extends keyof SectionABasic>(field: K, value: SectionABasic[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Prefilled contact info (read-only display) */}
      {(contactName || companyName) && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            {contactName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contactName}</span>
              </div>
            )}
            {companyName && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{companyName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Branża */}
        <div className="space-y-2">
          <Label>Branża</Label>
          <Select
            value={data.branza || ''}
            onValueChange={(value) => updateField('branza', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz branżę" />
            </SelectTrigger>
            <SelectContent>
              {BRANZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Email bezpośredni */}
        <div className="space-y-2">
          <Label>Email bezpośredni</Label>
          <Input
            type="email"
            value={data.email_bezposredni || ''}
            onChange={(e) => updateField('email_bezposredni', e.target.value)}
            placeholder="email@firma.pl"
          />
        </div>

        {/* Telefon prywatny */}
        <div className="space-y-2">
          <Label>Telefon prywatny</Label>
          <Input
            value={data.telefon_prywatny || ''}
            onChange={(e) => updateField('telefon_prywatny', e.target.value)}
            placeholder="+48 xxx xxx xxx"
          />
        </div>

        {/* WWW */}
        <div className="space-y-2">
          <Label>WWW</Label>
          <Input
            value={data.www || ''}
            onChange={(e) => updateField('www', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* NIP */}
        <div className="space-y-2">
          <Label>NIP</Label>
          <Input
            value={data.nip || ''}
            onChange={(e) => updateField('nip', e.target.value)}
            placeholder="XXX-XXX-XX-XX"
          />
        </div>

        {/* Źródło kontaktu */}
        <div className="space-y-2">
          <Label>Źródło kontaktu</Label>
          <Input
            value={data.zrodlo_kontaktu || ''}
            onChange={(e) => updateField('zrodlo_kontaktu', e.target.value)}
            placeholder="np. Polecenie, LinkedIn, Konferencja"
          />
        </div>
      </div>

      {/* Dane asystenta */}
      <div className="border-t pt-4">
        <Label className="text-sm text-muted-foreground mb-3 block">Dane asystenta (opcjonalne)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email asystenta</Label>
            <Input
              type="email"
              value={data.email_asystenta || ''}
              onChange={(e) => updateField('email_asystenta', e.target.value)}
              placeholder="asystent@firma.pl"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefon asystenta</Label>
            <Input
              value={data.telefon_asystenta || ''}
              onChange={(e) => updateField('telefon_asystenta', e.target.value)}
              placeholder="+48 xxx xxx xxx"
            />
          </div>
        </div>
      </div>

      {/* Kontekst spotkania (dawniej sekcja B) */}
      <div className="border-t pt-4">
        <Label className="text-sm text-muted-foreground mb-3 block">Kontekst spotkania</Label>
        
        <div className="space-y-4">
          {/* Podpowiedzi z BRIEF */}
          <div className="space-y-2">
            <Label>Podpowiedzi z BRIEF</Label>
            <Textarea
              value={data.podpowiedzi_brief || ''}
              onChange={(e) => updateField('podpowiedzi_brief', e.target.value)}
              placeholder="Notatki / podpowiedzi przygotowane przed spotkaniem..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status relacji - WYMAGANE */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Status relacji
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={data.status_relacji || ''}
                onValueChange={(value) => updateField('status_relacji', value as SectionABasic['status_relacji'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nowy">Nowy kontakt</SelectItem>
                  <SelectItem value="polecony">Polecony</SelectItem>
                  <SelectItem value="powracajacy">Powracający</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Typ kontaktu - NOWE */}
            <div className="space-y-2">
              <Label>Typ kontaktu</Label>
              <Select
                value={data.typ_kontaktu || ''}
                onValueChange={(value) => updateField('typ_kontaktu', value as SectionABasic['typ_kontaktu'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="znajomy">Znajomy</SelectItem>
                  <SelectItem value="klient">Klient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rozważa aplikację do CC */}
            <div className="space-y-2">
              <Label>Czy rozważa aplikację do CC?</Label>
              <Select
                value={data.rozważa_aplikacje_cc || ''}
                onValueChange={(value) => updateField('rozważa_aplikacje_cc', value as SectionABasic['rozważa_aplikacje_cc'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tak">Tak</SelectItem>
                  <SelectItem value="nie">Nie</SelectItem>
                  <SelectItem value="nie_wiem">Nie wiem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Firma nieznana */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="firma-nieznana"
              checked={data.firma_nieznana || false}
              onCheckedChange={(checked) => updateField('firma_nieznana', checked === true)}
            />
            <Label htmlFor="firma-nieznana" className="text-sm text-muted-foreground cursor-pointer">
              Firma nieznana na tym etapie
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
